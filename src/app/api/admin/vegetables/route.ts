
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 100;
const MAX_UNIT_LENGTH = 30;
const MAX_IMAGE_URL_LENGTH = 500;
const MAX_PRICE = "99999999.99";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function duplicateNameResponse() {
  return jsonResponse(
    {
      success: false,
      error:
        "A vegetable with this Telugu or English name already exists.",
    },
    409
  );
}

function serializeVegetable(vegetable: {
  id: string;
  nameTe: string;
  nameEn: string;
  price: {
    toString(): string;
  };
  unit: string;
  imageUrl: string | null;
  isAvailable: boolean;
}) {
  return {
    id: vegetable.id,
    nameTe: vegetable.nameTe,
    nameEn: vegetable.nameEn,
    price: vegetable.price.toString(),
    unit: vegetable.unit,
    imageUrl: vegetable.imageUrl,
    isAvailable: vegetable.isAvailable,
  };
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

function validateName(value: unknown, label: string) {
  if (typeof value !== "string") {
    return {
      value: null,
      error: `${label} is required.`,
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

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  if (numeric > Number(MAX_PRICE)) {
    return null;
  }

  return raw;
}

function validateUnit(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.length > MAX_UNIT_LENGTH
  ) {
    return null;
  }

  return trimmed;
}

function validateImageUrl(value: unknown) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:") {
      return null;
    }

    if (
      !url.hostname.endsWith(BLOB_HOST_SUFFIX) ||
      url.hostname === BLOB_HOST_SUFFIX.slice(1)
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

async function readJsonBody(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * GET — List all vegetables
 */
export async function GET() {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const vegetables = await prisma.vegetable.findMany({
      orderBy: {
        nameEn: "asc",
      },
    });

    return jsonResponse({
      success: true,
      vegetables: vegetables.map(serializeVegetable),
    });
  } catch (error) {
    console.error("ADMIN_VEGETABLES_GET_ERROR:", error);

    return jsonResponse(
      {
        success: false,
        error: "Unable to load vegetables.",
      },
      500
    );
  }
}

/**
 * POST — Add vegetable
 */
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await readJsonBody(request);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const nameTeResult = validateName(
      body.nameTe,
      "Telugu name"
    );

    if (nameTeResult.error) {
      return jsonResponse(
        {
          success: false,
          error: nameTeResult.error,
        },
        400
      );
    }

    const nameEnResult = validateName(
      body.nameEn,
      "English name"
    );

    if (nameEnResult.error) {
      return jsonResponse(
        {
          success: false,
          error: nameEnResult.error,
        },
        400
      );
    }

    const price = validatePrice(body.price);

    if (!price) {
      return jsonResponse(
        {
          success: false,
          error: "Enter a valid price.",
        },
        400
      );
    }

    const unit =
      body.unit === undefined
        ? "kg"
        : validateUnit(body.unit);

    if (!unit) {
      return jsonResponse(
        {
          success: false,
          error: "Unit must be between 1 and 30 characters.",
        },
        400
      );
    }

    const imageUrl =
      body.imageUrl === undefined ||
      body.imageUrl === null ||
      body.imageUrl === ""
        ? null
        : validateImageUrl(body.imageUrl);

    if (
      body.imageUrl !== undefined &&
      body.imageUrl !== null &&
      body.imageUrl !== "" &&
      !imageUrl
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Image URL must be a valid HTTPS VegItPTP image URL.",
        },
        400
      );
    }

    const isAvailable =
      body.isAvailable === undefined
        ? false
        : body.isAvailable;

    if (typeof isAvailable !== "boolean") {
      return jsonResponse(
        {
          success: false,
          error: "isAvailable must be a boolean.",
        },
        400
      );
    }

    const vegetable = await prisma.vegetable.create({
      data: {
        nameTe: nameTeResult.value!,
        nameEn: nameEnResult.value!,
        price,
        unit,
        imageUrl,
        isAvailable,
      },
    });

    return jsonResponse(
      {
        success: true,
        vegetable: serializeVegetable(vegetable),
      },
      201
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateNameResponse();
    }

    console.error("ADMIN_VEGETABLES_POST_ERROR:", error);

    return jsonResponse(
      {
        success: false,
        error: "Unable to add vegetable.",
      },
      500
    );
  }
}

/**
 * PATCH — Edit vegetable
 */
export async function PATCH(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await readJsonBody(request);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const id = validateId(body.id);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Vegetable id is required.",
        },
        400
      );
    }

    const existingVegetable =
      await prisma.vegetable.findUnique({
        where: {
          id,
        },
      });

    if (!existingVegetable) {
      return jsonResponse(
        {
          success: false,
          error: "Vegetable not found.",
        },
        404
      );
    }

    const data: {
      nameTe?: string;
      nameEn?: string;
      price?: string;
      unit?: string;
      imageUrl?: string | null;
      isAvailable?: boolean;
    } = {};

    let fieldCount = 0;

    if (body.nameTe !== undefined) {
      const result = validateName(
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

      data.nameTe = result.value!;
      fieldCount++;
    }

    if (body.nameEn !== undefined) {
      const result = validateName(
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

      data.nameEn = result.value!;
      fieldCount++;
    }

    if (body.price !== undefined) {
      const price = validatePrice(body.price);

      if (!price) {
        return jsonResponse(
          {
            success: false,
            error: "Enter a valid price.",
          },
          400
        );
      }

      data.price = price;
      fieldCount++;
    }

    if (body.unit !== undefined) {
      const unit = validateUnit(body.unit);

      if (!unit) {
        return jsonResponse(
          {
            success: false,
            error: "Unit must be between 1 and 30 characters.",
          },
          400
        );
      }

      data.unit = unit;
      fieldCount++;
    }

    if (body.imageUrl !== undefined) {
      if (
        body.imageUrl !== null &&
        body.imageUrl !== ""
      ) {
        const imageUrl = validateImageUrl(body.imageUrl);

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

        data.imageUrl = imageUrl;
      } else {
        data.imageUrl = null;
      }

      fieldCount++;
    }

    if (body.isAvailable !== undefined) {
      if (typeof body.isAvailable !== "boolean") {
        return jsonResponse(
          {
            success: false,
            error: "isAvailable must be a boolean.",
          },
          400
        );
      }

      data.isAvailable = body.isAvailable;
      fieldCount++;
    }

    if (fieldCount === 0) {
      return jsonResponse(
        {
          success: false,
          error: "No valid fields were provided.",
        },
        400
      );
    }

    const vegetable = await prisma.vegetable.update({
      where: {
        id,
      },
      data,
    });

    return jsonResponse({
      success: true,
      vegetable: serializeVegetable(vegetable),
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateNameResponse();
    }

    console.error("ADMIN_VEGETABLES_PATCH_ERROR:", error);

    return jsonResponse(
      {
        success: false,
        error: "Unable to update vegetable.",
      },
      500
    );
  }
}

/**
 * DELETE — Delete vegetable
 */
export async function DELETE(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await readJsonBody(request);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const id = validateId(body.id);

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error: "Vegetable id is required.",
        },
        400
      );
    }

    const vegetable = await prisma.vegetable.findUnique({
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
          error: "Vegetable not found.",
        },
        404
      );
    }

    const orderItemCount = await prisma.orderItem.count({
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

    await prisma.vegetable.delete({
      where: {
        id,
      },
    });

    return jsonResponse({
      success: true,
      message: "Vegetable deleted successfully.",
    });
  } catch (error) {
    console.error("ADMIN_VEGETABLES_DELETE_ERROR:", error);

    return jsonResponse(
      {
        success: false,
        error: "Unable to delete vegetable.",
      },
      500
    );
  }
}
