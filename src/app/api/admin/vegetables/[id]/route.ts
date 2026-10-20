import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 100;
const MAX_IMAGE_URL_LENGTH = 500;
const MAX_PRICE = "99999999.99";

const BLOB_HOST_SUFFIX =
  ".public.blob.vercel-storage.com";

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

function unauthorizedResponse() {
  return jsonResponse(
    {
      success: false,
      error: "Unauthorized.",
    },
    401
  );
}

function invalidOriginResponse() {
  return jsonResponse(
    {
      success: false,
      error: "Invalid request origin.",
    },
    403
  );
}

function validateId(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > MAX_ID_LENGTH
  ) {
    return null;
  }

  return value.trim();
}

function validateName(
  value: unknown,
  label: string
) {
  if (typeof value !== "string") {
    return {
      value: null,
      error: `${label} must be a string.`,
    };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return {
      value: null,
      error: `${label} cannot be empty.`,
    };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      value: null,
      error: `${label} must be ${MAX_NAME_LENGTH} characters or less.`,
    };
  }

  return {
    value: trimmed,
    error: null,
  };
}

function validatePrice(value: unknown) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const raw = String(value).trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const numeric = Number(raw);

  if (
    !Number.isFinite(numeric) ||
    numeric <= 0
  ) {
    return null;
  }

  if (numeric > Number(MAX_PRICE)) {
    return null;
  }

  return raw;
}

function validateImageUrl(
  value: unknown
) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.length >
    MAX_IMAGE_URL_LENGTH
  ) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:") {
      return null;
    }

    if (
      !url.hostname.endsWith(
        BLOB_HOST_SUFFIX
      )
    ) {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function readJsonBody(
  request: Request
) {
  try {
    const body = await request.json();

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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    /*
     * ---------------------------------------------
     * CSRF / Origin protection
     * ---------------------------------------------
     */

    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * ---------------------------------------------
     * Admin authentication
     * ---------------------------------------------
     */

    const isAdmin =
      await requireAdmin();

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Route parameter
     * ---------------------------------------------
     */

    const { id: rawId } =
      await context.params;

    const id = validateId(rawId);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Vegetable id is required.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Request body
     * ---------------------------------------------
     */

    const body =
      await readJsonBody(request);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Confirm vegetable exists
     * ---------------------------------------------
     */

    const vegetable =
      await prisma.vegetable.findUnique({
        where: {
          id,
        },
      });

    if (!vegetable) {
      return jsonResponse(
        {
          success: false,
          error: "Vegetable not found.",
        },
        404
      );
    }

    /*
     * ---------------------------------------------
     * Allowed update fields only
     * ---------------------------------------------
     */

    const data: {
      isAvailable?: boolean;
      price?: string;
      nameTe?: string;
      nameEn?: string;
      imageUrl?: string | null;
    } = {};

    /*
     * ---------------------------------------------
     * Availability
     * ---------------------------------------------
     */

    if (
      body.isAvailable !== undefined
    ) {
      if (
        typeof body.isAvailable !==
        "boolean"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "isAvailable must be a boolean.",
          },
          400
        );
      }

      data.isAvailable =
        body.isAvailable;
    }

    /*
     * ---------------------------------------------
     * Price
     * ---------------------------------------------
     */

    if (body.price !== undefined) {
      const price =
        validatePrice(body.price);

      if (!price) {
        return jsonResponse(
          {
            success: false,
            error:
              "Enter a valid price.",
          },
          400
        );
      }

      data.price = price;
    }

    /*
     * ---------------------------------------------
     * Telugu name
     * ---------------------------------------------
     */

    if (body.nameTe !== undefined) {
      const result =
        validateName(
          body.nameTe,
          "Telugu name"
        );

      if (result.error) {
        return jsonResponse(
          {
            success: false,
            error: result.error,
          },
          400
        );
      }

      data.nameTe =
        result.value!;
    }

    /*
     * ---------------------------------------------
     * English name
     * ---------------------------------------------
     */

    if (body.nameEn !== undefined) {
      const result =
        validateName(
          body.nameEn,
          "English name"
        );

      if (result.error) {
        return jsonResponse(
          {
            success: false,
            error: result.error,
          },
          400
        );
      }

      data.nameEn =
        result.value!;
    }

    /*
     * ---------------------------------------------
     * Image URL
     * ---------------------------------------------
     */

    if (
      body.imageUrl !== undefined
    ) {
      if (
        body.imageUrl !== null &&
        body.imageUrl !== ""
      ) {
        const imageUrl =
          validateImageUrl(
            body.imageUrl
          );

        if (!imageUrl) {
          return jsonResponse(
            {
              success: false,
              error:
                "Image URL must be a valid HTTPS VegItPTP image URL.",
            },
            400
          );
        }

        data.imageUrl =
          imageUrl;
      } else {
        data.imageUrl = null;
      }
    }

    /*
     * ---------------------------------------------
     * Require at least one update
     * ---------------------------------------------
     */

    if (
      Object.keys(data).length === 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "No changes provided.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Update vegetable
     * ---------------------------------------------
     */

    const updated =
      await prisma.vegetable.update({
        where: {
          id,
        },
        data,
      });

    return jsonResponse({
      success: true,
      vegetable: {
        id: updated.id,
        nameTe: updated.nameTe,
        nameEn: updated.nameEn,
        price:
          updated.price.toString(),
        unit: updated.unit,
        imageUrl:
          updated.imageUrl,
        isAvailable:
          updated.isAvailable,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN_VEGETABLE_UPDATE_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to update vegetable.",
      },
      500
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    /*
     * ---------------------------------------------
     * CSRF / Origin protection
     * ---------------------------------------------
     */

    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * ---------------------------------------------
     * Admin authentication
     * ---------------------------------------------
     */

    const isAdmin =
      await requireAdmin();

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Route parameter
     * ---------------------------------------------
     */

    const { id: rawId } =
      await context.params;

    const id = validateId(rawId);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Vegetable id is required.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Find vegetable
     * ---------------------------------------------
     */

    const vegetable =
      await prisma.vegetable.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          nameEn: true,
        },
      });

    if (!vegetable) {
      return jsonResponse(
        {
          success: false,
          error:
            "Vegetable not found.",
        },
        404
      );
    }

    /*
     * ---------------------------------------------
     * Protect historical orders
     * ---------------------------------------------
     */

    const orderItemCount =
      await prisma.orderItem.count({
        where: {
          vegetableId: id,
        },
      });

    if (orderItemCount > 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "This vegetable has historical orders and cannot be deleted. Disable it instead.",
        },
        409
      );
    }

    /*
     * ---------------------------------------------
     * Delete
     * ---------------------------------------------
     */

    await prisma.vegetable.delete({
      where: {
        id,
      },
    });

    return jsonResponse({
      success: true,
    });
  } catch (error) {
    console.error(
      "ADMIN_VEGETABLE_DELETE_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to delete vegetable.",
      },
      500
    );
  }
}