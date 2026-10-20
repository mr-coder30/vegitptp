import crypto from "crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {
  getWakitOtpStatus,
  verifyWakitOtp,
} from "@/lib/wakit";

const CUSTOMER_SESSION_COOKIE =
  "vegitptp-customer";

const OTP_VERIFICATION_COOKIE =
  "vegitptp-otp-verification-id";

const OTP_PHONE_COOKIE =
  "vegitptp-otp-phone";

const CUSTOMER_SESSION_DAYS = 30;

/*
 * Local OTP session lifetime.
 *
 * Matches the 10-minute maxAge used for the temporary OTP
 * cookies in send-otp. Wakit additionally enforces the real
 * per-message expiry during verification; this local bound
 * guarantees an OTP session can never be replayed later even
 * if a temporary cookie were somehow preserved.
 */

const OTP_SESSION_MAX_AGE_MS =
  10 * 60 * 1000;

/*
 * Maximum failed verification attempts for a single OTP session.
 *
 * Each incorrect code is also counted by Wakit on its side (every
 * /otp/verify call consumes one attempt), so this local cap is an
 * additional guard, not the only one.
 *
 * The counter is process-local and keyed by the server-side
 * OtpRequest id, which the browser never controls. On
 * multi-instance deployments it is a per-instance cap; the
 * global controls remain Wakit's per-OTP attempt consumption and
 * the send-otp cooldown and daily limits.
 */

const MAX_VERIFY_ATTEMPTS = 5;

const failedVerifyAttempts = new Map<
  string,
  { count: number; expiresAt: number }
>();

function purgeExpiredAttemptCounters(
  now: number
) {
  for (const [key, entry] of failedVerifyAttempts) {
    if (entry.expiresAt <= now) {
      failedVerifyAttempts.delete(key);
    }
  }
}

/**
 * Record one failed verification attempt.
 *
 * Returns `blocked: true` once the OTP session has reached the
 * attempt limit; the counter is then dropped and the caller must
 * invalidate the OTP session.
 */
function recordFailedAttempt(
  otpRequestId: string
): { blocked: boolean } {
  const now = Date.now();

  purgeExpiredAttemptCounters(now);

  const existing =
    failedVerifyAttempts.get(otpRequestId);

  const count =
    (existing?.count ?? 0) + 1;

  if (count >= MAX_VERIFY_ATTEMPTS) {
    failedVerifyAttempts.delete(
      otpRequestId
    );

    return { blocked: true };
  }

  failedVerifyAttempts.set(otpRequestId, {
    count,
    expiresAt:
      now + OTP_SESSION_MAX_AGE_MS,
  });

  return { blocked: false };
}

function clearFailedAttempts(
  otpRequestId: string
) {
  failedVerifyAttempts.delete(
    otpRequestId
  );
}

/*
 * Thrown inside the session transaction when another concurrent
 * request already consumed this OTP.
 */

class OtpConsumedError extends Error {
  constructor() {
    super("OTP already consumed.");
    this.name = "OtpConsumedError";
  }
}

function createSessionToken(): string {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function hashSessionToken(
  token: string
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function hashPhone(
  phone: string
): string {
  return crypto
    .createHash("sha256")
    .update(phone)
    .digest("hex");
}

function isValidIndianMobile(
  phone: string
): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function clearOtpCookies(
  cookieStore: Awaited<
    ReturnType<typeof cookies>
  >
) {
  cookieStore.delete(
    OTP_VERIFICATION_COOKIE
  );

  cookieStore.delete(
    OTP_PHONE_COOKIE
  );
}

function errorResponse(
  error: string,
  status: number
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: noStoreHeaders(),
    }
  );
}

/*
 * Create the customer for a verified phone number without ever
 * producing a duplicate account.
 *
 * Concurrent verifications for the same number can race the
 * upsert; a unique-constraint violation is resolved by re-reading
 * the row that won.
 */

async function findOrCreateCustomer(
  phone: string
) {
  try {
    return await prisma.customer.upsert({
      where: {
        phone,
      },

      update: {},

      create: {
        name: "",
        phone,
        address: "",
      },
    });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? (error as { code?: unknown })
            .code
        : undefined;

    if (code === "P2002") {
      const existing =
        await prisma.customer.findUnique(
          {
            where: { phone },
          }
        );

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
}

export async function POST(
  request: Request
) {
  try {
    /*
     * --------------------------------------------------
     * 1. Parse request safely
     * --------------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Invalid request.",
        400
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return errorResponse(
        "Invalid request.",
        400
      );
    }

    const data =
      body as Record<
        string,
        unknown
      >;

    const code =
      typeof data.code === "string"
        ? data.code.trim()
        : "";

    /*
     * --------------------------------------------------
     * 2. Validate OTP format
     * --------------------------------------------------
     */

    if (!/^\d{6}$/.test(code)) {
      return errorResponse(
        "Please enter the 6-digit OTP.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 3. Read temporary OTP state
     * --------------------------------------------------
     *
     * Provider configuration is checked by the Wakit
     * client (src/lib/wakit.ts) when the verification call
     * is made.
     *
     * Wakit is the only customer OTP provider.
     */

    const cookieStore =
      await cookies();

    /*
     * --------------------------------------------------
     * 4. Read temporary OTP state values
     * --------------------------------------------------
     */

    const verificationId =
      cookieStore.get(
        OTP_VERIFICATION_COOKIE
      )?.value;

    const phone =
      cookieStore.get(
        OTP_PHONE_COOKIE
      )?.value;

    if (
      !verificationId ||
      !phone
    ) {
      return errorResponse(
        "Your OTP session has expired. Please request a new OTP.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 5. Validate phone from temporary state
     * --------------------------------------------------
     */

    if (
      !isValidIndianMobile(phone)
    ) {
      clearOtpCookies(
        cookieStore
      );

      return errorResponse(
        "Invalid mobile number.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 6. Bind verification ID to phone
     * --------------------------------------------------
     *
     * The browser supplies both temporary cookies,
     * so neither value is trusted independently.
     *
     * The database record created by send-otp binds
     * the provider verification ID to the phone hash.
     * --------------------------------------------------
     */

    const otpRequest =
      await prisma.otpRequest.findFirst({
        where: {
          verificationId,
        },

        select: {
          id: true,
          phoneHash: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (!otpRequest) {
      clearOtpCookies(
        cookieStore
      );

      return errorResponse(
        "Your OTP session has expired. Please request a new OTP.",
        400
      );
    }

    const suppliedPhoneHash =
      hashPhone(phone);

    const storedPhoneHash =
      Buffer.from(
        otpRequest.phoneHash,
        "utf8"
      );

    const providedPhoneHash =
      Buffer.from(
        suppliedPhoneHash,
        "utf8"
      );

    if (
      storedPhoneHash.length !==
        providedPhoneHash.length ||
      !crypto.timingSafeEqual(
        storedPhoneHash,
        providedPhoneHash
      )
    ) {
      console.error(
        "OTP verification phone binding mismatch."
      );

      clearOtpCookies(
        cookieStore
      );

      return errorResponse(
        "Your OTP session is invalid. Please request a new OTP.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 6b. Enforce local OTP session expiry
     * --------------------------------------------------
     */

    if (
      Date.now() -
        otpRequest.createdAt.getTime() >
      OTP_SESSION_MAX_AGE_MS
    ) {
      clearOtpCookies(
        cookieStore
      );

      clearFailedAttempts(
        otpRequest.id
      );

      return errorResponse(
        "This OTP has expired. Please request a new OTP.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 7. Verify OTP with Wakit
     * --------------------------------------------------
     *
     * The provider verification id is bound to this phone
     * above, so the code can only ever verify the number
     * it was sent to.
     * --------------------------------------------------
     */

    const verifyResult =
      await verifyWakitOtp(
        verificationId,
        code
      );

    if (verifyResult.ok) {
      /*
       * --------------------------------------------------
       * 8. OTP VERIFIED
       * --------------------------------------------------
       */

      clearFailedAttempts(
        otpRequest.id
      );

      /*
       * Find or create customer using the phone
       * cryptographically bound to this verification.
       */

      const customer =
        await findOrCreateCustomer(phone);

      /*
       * Generate a cryptographically secure
       * customer session token.
       */

      const sessionToken =
        createSessionToken();

      /*
       * Store only the SHA-256 hash in PostgreSQL.
       */

      const tokenHash =
        hashSessionToken(sessionToken);

      const expiresAt = new Date();

      expiresAt.setDate(
        expiresAt.getDate() +
          CUSTOMER_SESSION_DAYS
      );

      /*
       * Consume the OTP and replace the customer's previous
       * session atomically, so concurrent verifications can
       * never both succeed or leave inconsistent accounts.
       */

      try {
        await prisma.$transaction(
          async (tx) => {
            /*
             * Single-use enforcement: the first
             * transaction to consume this row wins.
             * A concurrent request rolls back here
             * before any session is created.
             */

            const consumed =
              await tx.otpRequest.deleteMany(
                {
                  where: {
                    id: otpRequest.id,
                  },
                }
              );

            if (
              consumed.count === 0
            ) {
              throw new OtpConsumedError();
            }

            await tx.customerSession.deleteMany(
              {
                where: {
                  customerId:
                    customer.id,
                },
              }
            );

            await tx.customerSession.create(
              {
                data: {
                  customerId:
                    customer.id,

                  tokenHash,

                  expiresAt,
                },
              }
            );
          }
        );
      } catch (error) {
        if (
          error instanceof OtpConsumedError
        ) {
          clearOtpCookies(
            cookieStore
          );

          return errorResponse(
            "This OTP has already been used. Please request a new OTP.",
            400
          );
        }

        throw error;
      }

      /*
       * OTP verification is complete.
       * Remove temporary browser state.
       */

      clearOtpCookies(
        cookieStore
      );

      /*
       * Create the persistent authenticated
       * customer session.
       */

      cookieStore.set(
        CUSTOMER_SESSION_COOKIE,
        sessionToken,
        {
          httpOnly: true,

          secure:
            process.env.NODE_ENV ===
            "production",

          sameSite: "lax",

          expires: expiresAt,

          path: "/",
        }
      );

      return NextResponse.json(
        {
          success: true,

          message:
            "OTP verified successfully.",

          customer: {
            id: customer.id,

            phone:
              customer.phone,

            name:
              customer.name,

            address:
              customer.address,

            landmark:
              customer.landmark,

            locality:
              customer.locality,
          },
        },
        {
          status: 200,
          headers:
            noStoreHeaders(),
        }
      );
    }

    /*
     * --------------------------------------------------
     * 9. Wakit failure handling
     * --------------------------------------------------
     *
     * Log only the classification and HTTP status. The
     * OTP code, phone number, verification id and API key
     * are never logged.
     */

    console.error(
      "WAKIT_VERIFY_OTP_FAILED:",
      {
        kind: verifyResult.kind,
        httpStatus:
          verifyResult.httpStatus,
      }
    );

    if (
      verifyResult.kind ===
      "not_configured"
    ) {
      return errorResponse(
        "Authentication service is not configured.",
        500
      );
    }

    if (
      verifyResult.kind ===
      "rate_limited"
    ) {
      clearOtpCookies(
        cookieStore
      );

      clearFailedAttempts(
        otpRequest.id
      );

      return NextResponse.json(
        {
          error:
            "Too many verification attempts. Please request a new OTP.",
        },
        {
          status: 429,
          headers: noStoreHeaders(),
        }
      );
    }

    if (
      verifyResult.kind === "not_found"
    ) {
      clearOtpCookies(
        cookieStore
      );

      clearFailedAttempts(
        otpRequest.id
      );

      return errorResponse(
        "This OTP has expired. Please request a new OTP.",
        400
      );
    }

    if (
      verifyResult.kind === "incorrect"
    ) {
      const attempt =
        recordFailedAttempt(
          otpRequest.id
        );

      if (attempt.blocked) {
        clearOtpCookies(
          cookieStore
        );

        return NextResponse.json(
          {
            error:
              "Too many verification attempts. Please request a new OTP.",
          },
          {
            status: 429,
            headers: noStoreHeaders(),
          }
        );
      }

      /*
       * Incorrect OTP is not terminal.
       * Keep the temporary OTP session alive.
       */

      return errorResponse(
        "Incorrect OTP. Please try again.",
        400
      );
    }

    if (
      verifyResult.kind === "rejected"
    ) {
      /*
       * The provider refused the call without a clear
       * reason (for example a 422). Ask the delivery
       * status what actually happened to this OTP so an
       * expired or already-verified code is never
       * reported as a simple typo.
       */

      const status =
        await getWakitOtpStatus(
          verificationId
        );

      if (status === "verified") {
        clearOtpCookies(
          cookieStore
        );

        clearFailedAttempts(
          otpRequest.id
        );

        return errorResponse(
          "This OTP has already been used. Please request a new OTP.",
          400
        );
      }

      if (
        status === "expired" ||
        status === "failed"
      ) {
        clearOtpCookies(
          cookieStore
        );

        clearFailedAttempts(
          otpRequest.id
        );

        return errorResponse(
          "This OTP has expired. Please request a new OTP.",
          400
        );
      }

      const attempt =
        recordFailedAttempt(
          otpRequest.id
        );

      if (attempt.blocked) {
        clearOtpCookies(
          cookieStore
        );

        return NextResponse.json(
          {
            error:
              "Too many verification attempts. Please request a new OTP.",
          },
          {
            status: 429,
            headers: noStoreHeaders(),
          }
        );
      }

      return errorResponse(
        "Incorrect OTP. Please try again.",
        400
      );
    }

    /*
     * Timeout, unreachable provider, malformed response or
     * provider-side configuration/outage.
     *
     * Reported as an upstream failure and the temporary OTP
     * session is kept alive so the customer can retry
     * without requesting a new OTP. Never exposes provider
     * internals and never falls back to another provider.
     */

    if (
      verifyResult.kind === "timeout"
    ) {
      return errorResponse(
        "The OTP service took too long to respond. Please try again.",
        504
      );
    }

    return errorResponse(
      "The OTP service is unavailable right now. Please try again.",
      502
    );
  } catch (error) {
    /*
     * Log only a message: error objects from any layer may
     * contain request details that must not reach the logs.
     */

    console.error(
      "VERIFY_OTP_ERROR:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Unable to verify OTP. Please try again.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}
