import { NextResponse } from "next/server";
import {
  randomBytes,
  createHash,
} from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const ADMIN_COOKIE = "vegitptp-admin";

const SESSION_DURATION_SECONDS =
  60 * 60 * 24;

// Rate limit:
// Maximum 5 login attempts from one IP
// within a 15-minute window.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 200;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function hashIp(ip: string) {
  return createHash("sha256")
    .update(ip)
    .digest("hex");
}

function invalidCredentialsResponse() {
  return NextResponse.json(
    {
      error:
        "Invalid username or password.",
    },
    {
      status: 401,
      headers: noStoreHeaders(),
    }
  );
}

function rateLimitResponse() {
  return NextResponse.json(
    {
      error:
        "Too many login attempts. Please try again later.",
    },
    {
      status: 429,
      headers: {
        ...noStoreHeaders(),
        "Retry-After": String(
          LOGIN_WINDOW_MINUTES * 60
        ),
      },
    }
  );
}

function serverErrorResponse() {
  return NextResponse.json(
    {
      error:
        "Unable to process login.",
    },
    {
      status: 500,
      headers: noStoreHeaders(),
    }
  );
}

/*
 * Vercel supplies request forwarding information.
 *
 * We use the first forwarded address when available,
 * with x-real-ip as a fallback.
 *
 * This value is hashed before being stored in the DB.
 */
function getClientIp(request: Request) {
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
    request.headers.get("x-real-ip");

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

async function reserveLoginAttempt(ipHash: string) {
  return prisma.$transaction(async (tx) => {
    // Prisma's PostgreSQL driver adapter rejects advisory-lock SQL because it
    // expects row-mapped results and cannot safely handle the native lock call.
    // We therefore use the existing DB-backed attempt log as the rate-limit
    // source of truth and keep the validation inside the transaction.
    const windowStart = new Date(
      Date.now() -
        LOGIN_WINDOW_MINUTES * 60 * 1000
    );

    await tx.adminLoginAttempt.deleteMany({
      where: {
        ipHash,
        createdAt: {
          lt: windowStart,
        },
      },
    });

    const attempts = await tx.adminLoginAttempt.count({
      where: {
        ipHash,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      return { limited: true as const };
    }

    const reservation = await tx.adminLoginAttempt.create({
      data: {
        ipHash,
      },
      select: {
        id: true,
      },
    });

    return {
      limited: false as const,
      attemptId: reservation.id,
    };
  });
}

async function cleanupOldAttempts() {
  const cutoff = new Date(
    Date.now() -
      24 * 60 * 60 * 1000
  );

  await prisma.adminLoginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  });
}

async function readJsonBody(
  request: Request
) {
  try {
    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export async function POST(
  request: Request
) {
  try {
    /*
     * ---------------------------------------------
     * Determine client IP
     * ---------------------------------------------
     */

    const clientIp =
      getClientIp(request);

    const ipHash =
      hashIp(clientIp);

    /*
     * ---------------------------------------------
     * Rate limit
     * ---------------------------------------------
     */

    const reservation =
      await reserveLoginAttempt(ipHash);

    if (reservation.limited) {
      return rateLimitResponse();
    }

    /*
     * ---------------------------------------------
     * Parse request body safely
     * ---------------------------------------------
     */

    const body =
      await readJsonBody(request);

    if (!body) {
      return invalidCredentialsResponse();
    }

    /*
     * ---------------------------------------------
     * Extract credentials
     * ---------------------------------------------
     */

    const username =
      typeof body.username ===
      "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    /*
     * ---------------------------------------------
     * Validate credential format
     * ---------------------------------------------
     */

    if (
      !username ||
      !password
    ) {
      return invalidCredentialsResponse();
    }

    if (
      username.length >
        MAX_USERNAME_LENGTH ||
      password.length >
        MAX_PASSWORD_LENGTH
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * ---------------------------------------------
     * Find active admin
     * ---------------------------------------------
     */

    const admin =
      await prisma.admin.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
          passwordHash: true,
          isActive: true,
        },
      });

    /*
     * Always return the same response for:
     *
     * - username not found
     * - inactive admin
     * - incorrect password
     *
     * This prevents account enumeration.
     */

    if (
      !admin ||
      !admin.isActive
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * ---------------------------------------------
     * Verify password
     * ---------------------------------------------
     */

    const passwordValid =
      await bcrypt.compare(
        password,
        admin.passwordHash
      );

    if (!passwordValid) {
      return invalidCredentialsResponse();
    }

    /*
     * ---------------------------------------------
     * Create secure random session token
     * ---------------------------------------------
     */

    const token =
      randomBytes(32).toString(
        "hex"
      );

    const tokenHash =
      hashToken(token);

    const expiresAt =
      new Date(
        Date.now() +
          SESSION_DURATION_SECONDS *
            1000
      );

    /*
     * ---------------------------------------------
     * Replace previous admin sessions
     * ---------------------------------------------
     *
     * This keeps the intended single active
     * admin session model.
     * ---------------------------------------------
     */

    await prisma.$transaction(
      async (tx) => {
        await tx.adminSession.deleteMany(
          {
            where: {
              adminId: admin.id,
            },
          }
        );

        await tx.adminSession.create({
          data: {
            adminId: admin.id,
            tokenHash,
            expiresAt,
          },
        });

        await tx.adminLoginAttempt.deleteMany(
          {
            where: {
              id: reservation.attemptId,
            },
          }
        );
      }
    );

    /*
     * ---------------------------------------------
     * Best-effort cleanup
     * ---------------------------------------------
     *
     * Cleanup failure must never prevent login.
     * ---------------------------------------------
     */

    try {
      await cleanupOldAttempts();
    } catch (cleanupError) {
      console.error(
        "ADMIN_LOGIN_RATE_LIMIT_CLEANUP_ERROR:",
        cleanupError
      );
    }

    /*
     * ---------------------------------------------
     * Create response
     * ---------------------------------------------
     */

    const response =
      NextResponse.json(
        {
          success: true,
        },
        {
          status: 200,
          headers:
            noStoreHeaders(),
        }
      );

    /*
     * ---------------------------------------------
     * Secure session cookie
     * ---------------------------------------------
     */

    response.cookies.set(
      ADMIN_COOKIE,
      token,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          SESSION_DURATION_SECONDS,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "ADMIN_LOGIN_ERROR:",
      error
    );

    return serverErrorResponse();
  }
}