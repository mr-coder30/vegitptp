import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import { isSameOrigin } from "@/lib/csrf";

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

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function PATCH(request: Request) {
  try {
    /*
     * ---------------------------------------------
     * CSRF / Origin protection
     * ---------------------------------------------
     */

    if (!isSameOrigin(request)) {
      return jsonResponse(
        {
          error: "Invalid request origin.",
        },
        403
      );
    }

    /*
     * ---------------------------------------------
     * Authenticate customer
     * ---------------------------------------------
     */

    const authenticatedCustomer =
      await getAuthenticatedCustomer();

    if (!authenticatedCustomer) {
      return jsonResponse(
        {
          error:
            "Please login to update your profile.",
        },
        401
      );
    }

    /*
     * ---------------------------------------------
     * Parse request body safely
     * ---------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          error: "Invalid request body.",
        },
        400
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return jsonResponse(
        {
          error: "Invalid request body.",
        },
        400
      );
    }

    const data = body as Record<
      string,
      unknown
    >;

    /*
     * ---------------------------------------------
     * Extract allowed fields only
     * ---------------------------------------------
     *
     * Phone number and customer ID are intentionally
     * not accepted from the client.
     * ---------------------------------------------
     */

    const name = cleanString(data.name);
    const address = cleanString(data.address);
    const landmark = cleanString(data.landmark);
    const locality = cleanString(data.locality);

    /*
     * ---------------------------------------------
     * Validation
     * ---------------------------------------------
     */

    if (name.length < 2) {
      return jsonResponse(
        {
          error: "Please enter your name.",
        },
        400
      );
    }

    if (name.length > 80) {
      return jsonResponse(
        {
          error: "Name is too long.",
        },
        400
      );
    }

    if (address.length < 5) {
      return jsonResponse(
        {
          error:
            "Please enter your delivery address.",
        },
        400
      );
    }

    if (address.length > 300) {
      return jsonResponse(
        {
          error: "Address is too long.",
        },
        400
      );
    }

    if (landmark.length > 120) {
      return jsonResponse(
        {
          error: "Landmark is too long.",
        },
        400
      );
    }

    if (locality.length > 120) {
      return jsonResponse(
        {
          error: "Locality is too long.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Update only the authenticated customer
     * ---------------------------------------------
     */

    const customer =
      await prisma.customer.update({
        where: {
          id: authenticatedCustomer.id,
        },

        data: {
          name,
          address,
          landmark:
            landmark || null,
          locality:
            locality || null,
        },

        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          landmark: true,
          locality: true,
        },
      });

    /*
     * ---------------------------------------------
     * Success
     * ---------------------------------------------
     */

    return jsonResponse({
      success: true,
      customer,
    });
  } catch (error) {
    console.error(
      "CUSTOMER_PROFILE_UPDATE_ERROR:",
      error
    );

    return jsonResponse(
      {
        error:
          "Unable to update your profile.",
      },
      500
    );
  }
}