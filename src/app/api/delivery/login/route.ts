import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const DELIVERY_COOKIE = "vegitptp-delivery";

const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours

const MAX_ATTEMPTS = 5;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 200;

async function reserveLoginAttempt(ipHash: string) {
  return prisma.$transaction(async (tx) => {
    // Prisma's PostgreSQL driver adapter rejects advisory-lock SQL, so this
    // route keeps the rate-limit accounting in the DB without issuing raw lock
    // calls that are incompatible with the current adapter stack.
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - RATE_LIMIT_WINDOW_MS
    );

    await tx.deliveryLoginAttempt.deleteMany({
      where: {
        ipHash,
        createdAt: {
          lt: windowStart,
        },
      },
    });

    const recentAttempts =
      await tx.deliveryLoginAttempt.count({
        where: {
          ipHash,
          createdAt: {
            gte: windowStart,
          },
        },
      });

    if (recentAttempts >= MAX_ATTEMPTS) {
      const oldestAttempt =
        await tx.deliveryLoginAttempt.findFirst({
          where: {
            ipHash,
            createdAt: {
              gte: windowStart,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        });

      return {
        limited: true as const,
        retryAfterSeconds: oldestAttempt
          ? Math.max(
              1,
              Math.ceil(
                (
                  oldestAttempt.createdAt.getTime() +
                  RATE_LIMIT_WINDOW_MS -
                  now.getTime()
                ) / 1000
              )
            )
          : Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      };
    }

    const reservation =
      await tx.deliveryLoginAttempt.create({
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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

function getClientIp(request: Request) {
  /*
   * V1 keeps the existing proxy-header strategy.
   *
   * These headers should only be trusted when they
   * are supplied/overwritten by the deployment
   * infrastructure.
   */

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number
) {
  return NextResponse.json(body, {
    status,
    headers: noStoreHeaders(),
  });
}

function unauthorizedResponse() {
  return jsonResponse(
    {
      success: false,
      error: "Invalid username or password.",
    },
    401
  );
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(request: Request) {
  try {
    /*
     * -----------------------------------------------
     * 1. Identify client
     * -----------------------------------------------
     */

    const clientIp = getClientIp(request);

    const ipHash = hashIp(clientIp);

    /*
     * -----------------------------------------------
     * 2. Rate-limit failed attempts
     * -----------------------------------------------
     */

    const reservation =
      await reserveLoginAttempt(ipHash);

    if (reservation.limited) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many login attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            ...noStoreHeaders(),
            "Retry-After":
              String(reservation.retryAfterSeconds),
          },
        }
      );
    }

    /*
     * -----------------------------------------------
     * 3. Parse request safely
     * -----------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request.",
        },
        400
      );
    }

    if (!isPlainObject(body)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request.",
        },
        400
      );
    }

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    /*
     * -----------------------------------------------
     * 4. Validate credentials input
     * -----------------------------------------------
     */

    if (
      !username ||
      !password ||
      username.length > MAX_USERNAME_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return unauthorizedResponse();
    }

    /*
     * -----------------------------------------------
     * 5. Find active delivery account
     * -----------------------------------------------
     */

    const deliveryBoy =
      await prisma.deliveryBoy.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
          username: true,
          passwordHash: true,
          isActive: true,
        },
      });

    /*
     * Do not reveal whether the account exists
     * or is inactive.
     */

    if (
      !deliveryBoy ||
      !deliveryBoy.isActive
    ) {
      return unauthorizedResponse();
    }

    /*
     * -----------------------------------------------
     * 6. Verify password
     * -----------------------------------------------
     */

    const passwordValid = await bcrypt.compare(
      password,
      deliveryBoy.passwordHash
    );

    if (!passwordValid) {
      return unauthorizedResponse();
    }

    /*
     * -----------------------------------------------
     * 7. Successful authentication
     * -----------------------------------------------
     */

    await prisma.deliveryLoginAttempt.deleteMany({
      where: {
        id: reservation.attemptId,
      },
    });

    /*
     * -----------------------------------------------
     * 8. Create secure session
     * -----------------------------------------------
     */

    const token = randomBytes(32).toString("hex");

    const tokenHash = hashToken(token);

    const expiresAt = new Date(
      Date.now() +
        SESSION_DURATION_SECONDS * 1000
    );

    /*
     * One active delivery session per account.
     */

    await prisma.deliverySession.deleteMany({
      where: {
        deliveryBoyId: deliveryBoy.id,
      },
    });

    await prisma.deliverySession.create({
      data: {
        deliveryBoyId: deliveryBoy.id,
        tokenHash,
        expiresAt,
      },
    });

    /*
     * -----------------------------------------------
     * 9. Secure session cookie
     * -----------------------------------------------
     */

    const response = NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );

    response.cookies.set(
      DELIVERY_COOKIE,
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
      "DELIVERY_LOGIN_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to login.",
      },
      500
    );
  }
}