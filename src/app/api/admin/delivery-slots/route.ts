import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

const MAX_LABEL_LENGTH = 50;
const MAX_SORT_ORDER = 1_000_000;

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

function jsonResponse(
  body: unknown,
  status = 200
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

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function parseJsonBody(
  request: Request
): Promise<
  | {
      success: true;
      body: Record<string, unknown>;
    }
  | {
      success: false;
      response: NextResponse;
    }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: jsonResponse(
        {
          success: false,
          error: "Invalid JSON body.",
        },
        400
      ),
    };
  }

  if (!isPlainObject(body)) {
    return {
      success: false,
      response: jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400
      ),
    };
  }

  return {
    success: true,
    body,
  };
}

function normalizeTime(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const time = value.trim();

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] =
    time.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return time;
}

function normalizeLabel(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const label = value.trim();

  if (
    !label ||
    label.length > MAX_LABEL_LENGTH
  ) {
    return null;
  }

  return label;
}

function normalizeSortOrder(
  value: unknown
): number | null {
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
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > MAX_SORT_ORDER
  ) {
    return null;
  }

  return Math.floor(number);
}

function serializeSlot(slot: {
  id: string;
  label: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: slot.id,
    label: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isActive: slot.isActive,
    sortOrder: slot.sortOrder,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  };
}

/**
 * GET
 *
 * Returns all delivery slots for the admin panel,
 * including inactive slots.
 */
export async function GET() {
  try {
    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    const slots =
      await prisma.deliverySlot.findMany({
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            startTime: "asc",
          },
        ],
      });

    return jsonResponse({
      success: true,
      slots: slots.map(serializeSlot),
    });
  } catch (error) {
    console.error(
      "ADMIN_DELIVERY_SLOTS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load delivery slots.",
      },
      500
    );
  }
}

/**
 * POST
 *
 * Creates a new delivery slot.
 */
export async function POST(
  request: Request
) {
  try {
    /*
     * CSRF protection
     */
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * Admin authentication
     */
    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * Safe JSON parsing
     */
    const parsed =
      await parseJsonBody(request);

    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.body;

    /*
     * Validate label
     */
    const label =
      normalizeLabel(body.label);

    if (!label) {
      return jsonResponse(
        {
          success: false,
          error:
            "A valid slot label is required.",
        },
        400
      );
    }

    /*
     * Validate start time
     */
    const startTime =
      normalizeTime(body.startTime);

    if (!startTime) {
      return jsonResponse(
        {
          success: false,
          error:
            "A valid start time is required. Use HH:MM format.",
        },
        400
      );
    }

    /*
     * Validate optional end time
     */
    const hasEndTime =
      body.endTime !== null &&
      body.endTime !== undefined &&
      body.endTime !== "";

    let endTime: string | null = null;

    if (hasEndTime) {
      endTime =
        normalizeTime(body.endTime);

      if (!endTime) {
        return jsonResponse(
          {
            success: false,
            error:
              "A valid end time is required. Use HH:MM format.",
          },
          400
        );
      }
    }

    /*
     * Validate time order
     */
    if (
      endTime &&
      endTime <= startTime
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "End time must be later than start time.",
        },
        400
      );
    }

    /*
     * isActive defaults to true.
     * If provided, it must be boolean.
     */
    let isActive = true;

    if (body.isActive !== undefined) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "isActive must be a boolean.",
          },
          400
        );
      }

      isActive = body.isActive;
    }

    /*
     * Determine sort order.
     */
    let sortOrder: number;

    if (body.sortOrder !== undefined) {
      const normalized =
        normalizeSortOrder(
          body.sortOrder
        );

      if (normalized === null) {
        return jsonResponse(
          {
            success: false,
            error:
              "sortOrder must be a non-negative number within the allowed range.",
          },
          400
        );
      }

      sortOrder = normalized;
    } else {
      const lastSlot =
        await prisma.deliverySlot.findFirst(
          {
            orderBy: {
              sortOrder: "desc",
            },
            select: {
              sortOrder: true,
            },
          }
        );

      sortOrder =
        (lastSlot?.sortOrder ?? 0) +
        10;

      if (
        sortOrder > MAX_SORT_ORDER
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Unable to assign a valid sort order.",
          },
          400
        );
      }
    }

    /*
     * Create slot.
     */
    const slot =
      await prisma.deliverySlot.create({
        data: {
          label,
          startTime,
          endTime,
          isActive,
          sortOrder,
        },
      });

    return jsonResponse(
      {
        success: true,
        slot: serializeSlot(slot),
      },
      201
    );
  } catch (error) {
    console.error(
      "ADMIN_DELIVERY_SLOTS_POST_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to create delivery slot.",
      },
      500
    );
  }
}

/**
 * PATCH
 *
 * Updates an existing delivery slot.
 */
export async function PATCH(
  request: Request
) {
  try {
    /*
     * CSRF protection
     */
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * Admin authentication
     */
    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * Safe JSON parsing
     */
    const parsed =
      await parseJsonBody(request);

    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.body;

    /*
     * Validate ID
     */
    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id || id.length > 100) {
      return jsonResponse(
        {
          success: false,
          error:
            "Delivery slot ID is required.",
        },
        400
      );
    }

    /*
     * Find existing slot.
     */
    const existingSlot =
      await prisma.deliverySlot.findUnique({
        where: {
          id,
        },
      });

    if (!existingSlot) {
      return jsonResponse(
        {
          success: false,
          error:
            "Delivery slot not found.",
        },
        404
      );
    }

    const data: {
      label?: string;
      startTime?: string;
      endTime?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    } = {};

    /*
     * Label
     */
    if (body.label !== undefined) {
      const label =
        normalizeLabel(body.label);

      if (!label) {
        return jsonResponse(
          {
            success: false,
            error:
              "A valid slot label is required.",
          },
          400
        );
      }

      data.label = label;
    }

    /*
     * Start time
     */
    if (body.startTime !== undefined) {
      const startTime =
        normalizeTime(
          body.startTime
        );

      if (!startTime) {
        return jsonResponse(
          {
            success: false,
            error:
              "A valid start time is required. Use HH:MM format.",
          },
          400
        );
      }

      data.startTime = startTime;
    }

    /*
     * End time
     */
    if (body.endTime !== undefined) {
      if (
        body.endTime === null ||
        body.endTime === ""
      ) {
        data.endTime = null;
      } else {
        const endTime =
          normalizeTime(
            body.endTime
          );

        if (!endTime) {
          return jsonResponse(
            {
              success: false,
              error:
                "A valid end time is required. Use HH:MM format.",
            },
            400
          );
        }

        data.endTime = endTime;
      }
    }

    /*
     * Active state
     */
    if (body.isActive !== undefined) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "isActive must be a boolean.",
          },
          400
        );
      }

      data.isActive =
        body.isActive;
    }

    /*
     * Sort order
     */
    if (body.sortOrder !== undefined) {
      const sortOrder =
        normalizeSortOrder(
          body.sortOrder
        );

      if (sortOrder === null) {
        return jsonResponse(
          {
            success: false,
            error:
              "sortOrder must be a non-negative number within the allowed range.",
          },
          400
        );
      }

      data.sortOrder = sortOrder;
    }

    /*
     * Ensure at least one supported field
     * is being updated.
     */
    if (
      Object.keys(data).length === 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "No valid fields were provided for update.",
        },
        400
      );
    }

    /*
     * Validate final time combination,
     * including fields that were not changed.
     */
    const finalStartTime =
      data.startTime ??
      existingSlot.startTime;

    const finalEndTime =
      data.endTime !== undefined
        ? data.endTime
        : existingSlot.endTime;

    if (
      finalEndTime &&
      finalEndTime <=
        finalStartTime
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "End time must be later than start time.",
        },
        400
      );
    }

    /*
     * Update.
     */
    const slot =
      await prisma.deliverySlot.update({
        where: {
          id,
        },
        data,
      });

    return jsonResponse({
      success: true,
      slot: serializeSlot(slot),
    });
  } catch (error) {
    console.error(
      "ADMIN_DELIVERY_SLOTS_PATCH_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to update delivery slot.",
      },
      500
    );
  }
}

/**
 * DELETE
 *
 * Deletes a delivery slot only if it has never
 * been used by an order.
 */
export async function DELETE(
  request: Request
) {
  try {
    /*
     * CSRF protection
     */
    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * Admin authentication
     */
    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * Safe JSON parsing
     */
    const parsed =
      await parseJsonBody(request);

    if (!parsed.success) {
      return parsed.response;
    }

    const body = parsed.body;

    /*
     * Validate ID
     */
    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id || id.length > 100) {
      return jsonResponse(
        {
          success: false,
          error:
            "Delivery slot ID is required.",
        },
        400
      );
    }

    /*
     * Delete inside a transaction.
     *
     * The slot is deleted only if no order currently
     * references it.
     *
     * The foreign-key constraint provides the final
     * protection if an order is inserted concurrently.
     */
    const deleted =
      await prisma.$transaction(
        async (tx) => {
          const slot =
            await tx.deliverySlot.findUnique(
              {
                where: {
                  id,
                },
                select: {
                  id: true,
                },
              }
            );

          if (!slot) {
            return {
              type: "NOT_FOUND" as const,
            };
          }

          const orderCount =
            await tx.order.count({
              where: {
                deliverySlotId: id,
              },
            });

          if (orderCount > 0) {
            return {
              type: "HAS_ORDERS" as const,
            };
          }

          try {
            await tx.deliverySlot.delete({
              where: {
                id,
              },
            });
          } catch {
            /*
             * A concurrent order/reference may have
             * appeared. Treat this as a conflict rather
             * than exposing a database error.
             */
            return {
              type: "HAS_ORDERS" as const,
            };
          }

          return {
            type: "DELETED" as const,
          };
        }
      );

    if (
      deleted.type ===
      "NOT_FOUND"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Delivery slot not found.",
        },
        404
      );
    }

    if (
      deleted.type ===
      "HAS_ORDERS"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This delivery slot has existing orders and cannot be deleted. Disable it instead.",
        },
        409
      );
    }

    return jsonResponse({
      success: true,
    });
  } catch (error) {
    console.error(
      "ADMIN_DELIVERY_SLOTS_DELETE_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to delete delivery slot.",
      },
      500
    );
  }
}