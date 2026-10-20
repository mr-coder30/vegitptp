import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

const DELIVERY_COOKIE = "vegitptp-delivery";

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function clearDeliveryCookie(response: NextResponse) {
  response.cookies.set(
    DELIVERY_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );
}

export async function POST() {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get(DELIVERY_COOKIE)?.value;

    if (token) {
      const tokenHash = hashToken(token);

      await prisma.deliverySession.deleteMany({
        where: {
          tokenHash,
        },
      });
    }

    const response = NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    clearDeliveryCookie(response);

    return response;
  } catch (error) {
    console.error(
      "DELIVERY_LOGOUT_ERROR:",
      error
    );

    /*
     * Even if database cleanup fails,
     * invalidate the browser session locally.
     */
    const response = NextResponse.json(
      {
        error: "Unable to complete logout.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    clearDeliveryCookie(response);

    return response;
  }
}