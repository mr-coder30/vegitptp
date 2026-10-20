import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

const CUSTOMER_COOKIE = "vegitptp-customer";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST() {
  try {
    const cookieStore = await cookies();

    const sessionToken =
      cookieStore.get(
        CUSTOMER_COOKIE
      )?.value;

    if (sessionToken) {
      const tokenHash =
        createHash("sha256")
          .update(sessionToken)
          .digest("hex");

      await prisma.customerSession.deleteMany({
        where: {
          tokenHash,
        },
      });
    }

    /*
     * Always clear the browser cookie.
     *
     * This also handles the case where the cookie
     * exists but its database session no longer exists.
     */

    cookieStore.delete(CUSTOMER_COOKIE);

    return jsonResponse({
      success: true,
    });
  } catch (error) {
    console.error(
      "CUSTOMER_LOGOUT_ERROR:",
      error
    );

    /*
     * Even if the database operation fails, clear the
     * browser session cookie so the client doesn't retain
     * the authentication token.
     */

    const response = jsonResponse(
      {
        error:
          "Unable to complete logout.",
      },
      500
    );

    response.cookies.delete(
      CUSTOMER_COOKIE
    );

    return response;
  }
}