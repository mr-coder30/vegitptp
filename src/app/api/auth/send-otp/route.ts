import crypto from "crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { sendWakitOtp } from "@/lib/wakit";

const OTP_VERIFICATION_COOKIE =
  "vegitptp-otp-verification-id";

const OTP_PHONE_COOKIE =
  "vegitptp-otp-phone";

const PHONE_COOLDOWN_SECONDS = 60;
const PHONE_DAILY_LIMIT = 3;
const IP_DAILY_LIMIT = 10;

const ONE_DAY_MS =
  24 * 60 * 60 * 1000;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function isValidIndianMobile(
  phone: string
): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function hashValue(
  value: string
): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function getClientIp(
  request: Request
): string | null {
  /*
   * In production, this should come from a trusted
   * deployment/proxy configuration.
   *
   * Do not assume arbitrary client-supplied
   * x-forwarded-for values are trustworthy unless
   * the hosting platform overwrites them.
   */

  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    request.headers.get(
      "x-real-ip"
    );

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return null;
}

function getSecondsUntil(
  date: Date
): number {
  return Math.max(
    1,
    Math.ceil(
      (date.getTime() -
        Date.now()) /
        1000
    )
  );
}

function errorResponse(
  error: string,
  status: number,
  retryAfterSeconds?: number
) {
  const headers: Record<
    string,
    string
  > = {
    ...noStoreHeaders(),
  };

  if (
    retryAfterSeconds !== undefined
  ) {
    headers["Retry-After"] =
      String(retryAfterSeconds);
  }

  return NextResponse.json(
    {
      error,
      ...(retryAfterSeconds !==
      undefined
        ? {
            retryAfterSeconds,
          }
        : {}),
    },
    {
      status,
      headers,
    }
  );
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

    const phone =
      typeof data.phone === "string"
        ? data.phone.trim()
        : "";

    /*
     * --------------------------------------------------
     * 2. Validate phone number
     * --------------------------------------------------
     */

    if (
      !isValidIndianMobile(phone)
    ) {
      return errorResponse(
        "Please enter a valid 10-digit mobile number.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 3. Create privacy-safe hashes
     * --------------------------------------------------
     */

    const phoneHash =
      hashValue(phone);

    const clientIp =
      getClientIp(request);

    const ipHash =
      clientIp
        ? hashValue(clientIp)
        : null;

    const now = new Date();

    const dayStart =
      new Date(
        now.getTime() -
          ONE_DAY_MS
      );

    /*
     * --------------------------------------------------
     * 4. Remove old rate-limit records
     * --------------------------------------------------
     */

    await prisma.otpRequest.deleteMany({
      where: {
        createdAt: {
          lt: dayStart,
        },
      },
    });

    /*
     * --------------------------------------------------
     * 5. PHONE COOLDOWN
     * --------------------------------------------------
     */

    const latestPhoneRequest =
      await prisma.otpRequest.findFirst({
        where: {
          phoneHash,
          createdAt: {
            gte: dayStart,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (latestPhoneRequest) {
      const cooldownEndsAt =
        new Date(
          latestPhoneRequest.createdAt.getTime() +
            PHONE_COOLDOWN_SECONDS *
              1000
        );

      if (
        cooldownEndsAt > now
      ) {
        const retryAfterSeconds =
          getSecondsUntil(
            cooldownEndsAt
          );

        return errorResponse(
          "Please wait before requesting another OTP.",
          429,
          retryAfterSeconds
        );
      }
    }

    /*
     * --------------------------------------------------
     * 6. PHONE DAILY LIMIT
     * --------------------------------------------------
     */

    const phoneRequestCount =
      await prisma.otpRequest.count({
        where: {
          phoneHash,
          createdAt: {
            gte: dayStart,
          },
        },
      });

    if (
      phoneRequestCount >=
      PHONE_DAILY_LIMIT
    ) {
      const retryAfterSeconds =
        getSecondsUntil(
          new Date(
            dayStart.getTime() +
              ONE_DAY_MS
          )
        );

      return errorResponse(
        "OTP request limit reached for today. Please try again tomorrow.",
        429,
        retryAfterSeconds
      );
    }

    /*
     * --------------------------------------------------
     * 7. IP DAILY LIMIT
     * --------------------------------------------------
     */

    let ipRequestCount = 0;

    if (ipHash) {
      ipRequestCount =
        await prisma.otpRequest.count({
          where: {
            ipHash,
            createdAt: {
              gte: dayStart,
            },
          },
        });
    }

    if (
      ipRequestCount >=
      IP_DAILY_LIMIT
    ) {
      const retryAfterSeconds =
        getSecondsUntil(
          new Date(
            dayStart.getTime() +
              ONE_DAY_MS
          )
        );

      return errorResponse(
        "Too many OTP requests from this network. Please try again later.",
        429,
        retryAfterSeconds
      );
    }

    /*
     * --------------------------------------------------
     * 8. SEND OTP THROUGH WAKIT (WHATSAPP)
     * --------------------------------------------------
     *
     * Wakit is contacted only after all application-level
     * limits have passed.
     *
     * There is intentionally no provider fallback: if Wakit
     * fails, the customer receives a safe error and no OTP
     * state is stored.
     */

    const result =
      await sendWakitOtp(phone);

    if (!result.ok) {
      /*
       * Log only the classification and HTTP status.
       *
       * Never log the phone number, the Wakit API key,
       * the authorization header or any OTP.
       */

      console.error(
        "WAKIT_SEND_OTP_FAILED:",
        {
          kind: result.kind,
          httpStatus: result.httpStatus,
        }
      );

      if (
        result.kind === "not_configured"
      ) {
        return errorResponse(
          "Authentication service is not configured.",
          500
        );
      }

      if (
        result.kind === "rate_limited"
      ) {
        return errorResponse(
          "Too many OTP requests right now. Please try again later.",
          429,
          result.retryAfterSeconds ??
            PHONE_COOLDOWN_SECONDS
        );
      }

      /*
       * WhatsApp unavailable for this number, provider
       * outage, timeout or upstream error.
       *
       * Reported as 503 so the client can show a clear,
       * translated message.
       */

      return errorResponse(
        "We couldn't send your OTP right now. Please make sure this number is active on WhatsApp and try again later.",
        503
      );
    }

    /*
     * --------------------------------------------------
     * 9. RECORD SUCCESSFUL OTP REQUEST
     * --------------------------------------------------
     */

    await prisma.otpRequest.create({
      data: {
        phoneHash,
        ipHash,
        verificationId: result.id,
      },
    });

    /*
     * --------------------------------------------------
     * 10. STORE TEMPORARY OTP VERIFICATION STATE
     * --------------------------------------------------
     */

    const cookieStore =
      await cookies();

    cookieStore.set(
      OTP_VERIFICATION_COOKIE,
      result.id,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      }
    );

    cookieStore.set(
      OTP_PHONE_COOKIE,
      phone,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      }
    );

    /*
     * --------------------------------------------------
     * 11. RESPONSE
     * --------------------------------------------------
     */

    const remainingRequests =
      Math.max(
        0,
        PHONE_DAILY_LIMIT -
          (phoneRequestCount + 1)
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "OTP sent successfully.",
        /*
         * Kept for response-contract compatibility.
         * Wakit returns an absolute expiry timestamp
         * instead of the previous provider's timeout
         * value; expiry is enforced server-side.
         */
        timeout: null,
        resendAfterSeconds:
          PHONE_COOLDOWN_SECONDS,
        remainingRequests,
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );
  } catch (error) {
    /*
     * Log only a message: error objects from any layer may
     * contain request details that must not reach the logs.
     */

    console.error(
      "SEND_OTP_ERROR:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Unable to send OTP. Please try again.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}