import crypto from "crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const CUSTOMER_SESSION_COOKIE =
  "vegitptp-customer";

function hashSessionToken(
  token: string
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const sessionToken =
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE
      )?.value;

    /*
     * No customer session.
     *
     * This is a normal unauthenticated state,
     * not a server error.
     */
    if (!sessionToken) {
      return NextResponse.json(
        {
          authenticated: false,
          customer: null,
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    /*
     * Never query the database using the raw
     * session token.
     *
     * Only the SHA-256 hash is stored in PostgreSQL.
     */
    const tokenHash =
      hashSessionToken(sessionToken);

    const session =
      await prisma.customerSession.findUnique({
        where: {
          tokenHash,
        },

        select: {
          id: true,
          expiresAt: true,

          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              landmark: true,
              locality: true,
            },
          },
        },
      });

    /*
     * Session doesn't exist.
     *
     * Clear the browser cookie because it is no
     * longer useful.
     */
    if (!session) {
      cookieStore.delete(
        CUSTOMER_SESSION_COOKIE
      );

      return NextResponse.json(
        {
          authenticated: false,
          customer: null,
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    /*
     * Server-side expiration check.
     *
     * Do not rely only on the browser cookie expiry.
     */
    if (
      session.expiresAt <= new Date()
    ) {
      await prisma.customerSession.deleteMany({
        where: {
          id: session.id,
        },
      });

      cookieStore.delete(
        CUSTOMER_SESSION_COOKIE
      );

      return NextResponse.json(
        {
          authenticated: false,
          customer: null,
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    /*
     * Return only customer information that the
     * customer-facing application needs.
     *
     * Never return the session token or token hash.
     */
    return NextResponse.json(
      {
        authenticated: true,

        customer: {
          id:
            session.customer.id,

          name:
            session.customer.name,

          phone:
            session.customer.phone,

          address:
            session.customer.address,

          landmark:
            session.customer.landmark,

          locality:
            session.customer.locality,
        },
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "CUSTOMER_SESSION_LOOKUP_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to check customer session.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}