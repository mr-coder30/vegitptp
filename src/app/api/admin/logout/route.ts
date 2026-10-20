import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/csrf";

const ADMIN_COOKIE = "vegitptp-admin";

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function clearAdminCookie(
  response: NextResponse
) {
  response.cookies.set(
    ADMIN_COOKIE,
    "",
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge: 0,
    }
  );

  return response;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(
  request: Request
) {
  /*
   * ---------------------------------------------
   * CSRF / Origin protection
   * ---------------------------------------------
   */

  if (!isSameOrigin(request)) {
    return clearAdminCookie(
      jsonResponse(
        {
          success: false,
          error:
            "Invalid request origin.",
        },
        403
      )
    );
  }

  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        ADMIN_COOKIE
      )?.value;

    /*
     * ---------------------------------------------
     * Delete the current DB session
     * ---------------------------------------------
     */

    if (token) {
      const tokenHash =
        hashToken(token);

      await prisma.adminSession.deleteMany(
        {
          where: {
            tokenHash,
          },
        }
      );
    }

    /*
     * ---------------------------------------------
     * Always clear browser cookie
     * ---------------------------------------------
     */

    return clearAdminCookie(
      jsonResponse({
        success: true,
      })
    );
  } catch (error) {
    console.error(
      "ADMIN_LOGOUT_ERROR:",
      error
    );

    /*
     * Even if database cleanup fails,
     * remove the browser session cookie.
     */

    return clearAdminCookie(
      jsonResponse({
        success: true,
      })
    );
  }
}