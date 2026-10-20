import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

const DEFAULT_SETTINGS = {
  minimumOrder: 139,
  deliveryCharge: 20,
};

const MAX_SETTING_VALUE = 100000;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: noStoreHeaders(),
  });
}

function unauthorizedResponse() {
  return jsonResponse(
    { success: false, error: "Unauthorized." },
    401
  );
}

function invalidOriginResponse() {
  return jsonResponse(
    { success: false, error: "Invalid request origin." },
    403
  );
}

async function getOrCreateSettings() {
  return prisma.storeSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_SETTINGS,
    },
    update: {},
  });
}

function serializeSettings(settings: {
  minimumOrder: unknown;
  deliveryCharge: unknown;
}) {
  return {
    minimumOrder: Number(settings.minimumOrder),
    deliveryCharge: Number(settings.deliveryCharge),
  };
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

function parseSettingValue(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return null;
  }

  const number =
    typeof value === "number" ? value : Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > MAX_SETTING_VALUE
  ) {
    return null;
  }

  if (Math.round(number * 100) !== number * 100) {
    return null;
  }

  return number;
}

/**
 * GET — Load store pricing settings.
 */
export async function GET() {
  try {
    const authenticated = await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    const settings = await getOrCreateSettings();

    return jsonResponse({
      success: true,
      settings: serializeSettings(settings),
    });
  } catch (error) {
    console.error("ADMIN_SETTINGS_GET_ERROR:", error);

    return jsonResponse(
      {
        success: false,
        error: "Unable to load settings.",
      },
      500
    );
  }
}

/**
 * PATCH — Update store pricing settings.
 *
 * Both minimumOrder and deliveryCharge are editable.
 * At least one supported setting must be supplied.
 *
 * The delivery charge applies to every order.
 * There is no free-delivery threshold.
 */
export async function PATCH(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    const authenticated = await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON body.",
        },
        400
      );
    }

    if (!isPlainObject(body)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      );
    }

    const hasMinimumOrder =
      Object.prototype.hasOwnProperty.call(
        body,
        "minimumOrder"
      );

    const hasDeliveryCharge =
      Object.prototype.hasOwnProperty.call(
        body,
        "deliveryCharge"
      );

    if (!hasMinimumOrder && !hasDeliveryCharge) {
      return jsonResponse(
        {
          success: false,
          error: "No supported settings were provided.",
        },
        400
      );
    }

    const updateData: {
      minimumOrder?: number;
      deliveryCharge?: number;
    } = {};

    if (hasMinimumOrder) {
      const minimumOrder = parseSettingValue(
        body.minimumOrder
      );

      if (minimumOrder === null) {
        return jsonResponse(
          {
            success: false,
            error:
              "Enter a valid minimum order from ₹0 to ₹100,000, with up to two decimal places.",
          },
          400
        );
      }

      updateData.minimumOrder = minimumOrder;
    }

    if (hasDeliveryCharge) {
      const deliveryCharge = parseSettingValue(
        body.deliveryCharge
      );

      if (deliveryCharge === null) {
        return jsonResponse(
          {
            success: false,
            error:
              "Enter a valid delivery charge from ₹0 to ₹100,000, with up to two decimal places.",
          },
          400
        );
      }

      updateData.deliveryCharge = deliveryCharge;
    }

    const settings = await prisma.storeSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...DEFAULT_SETTINGS,
        ...updateData,
      },
      update: updateData,
    });

    return jsonResponse({
      success: true,
      settings: serializeSettings(settings),
    });
  } catch (error) {
    console.error("ADMIN_SETTINGS_PATCH_ERROR:", error);

    return jsonResponse(
      {
        success: false,
        error: "Unable to save settings.",
      },
      500
    );
  }
}