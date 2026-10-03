import { NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username =
      typeof body?.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      console.error(
        "ADMIN_USERNAME or ADMIN_PASSWORD is not configured."
      );

      return NextResponse.json(
        {
          error:
            "Admin login is not configured on the server.",
        },
        { status: 500 }
      );
    }

    if (
      username !== ADMIN_USERNAME ||
      password !== ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          error: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      "vegitptp-admin",
      "authenticated",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "ADMIN_LOGIN_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to process login.",
      },
      { status: 500 }
    );
  }
}