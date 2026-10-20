import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";
import { sendOrderStatusNotification } from "@/lib/web-push";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

type OrderStatus =
  (typeof VALID_STATUSES)[number];

const MAX_ID_LENGTH = 100;

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

function isValidStatus(
  value: unknown
): value is OrderStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(
      value as OrderStatus
    )
  );
}

function isValidId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    value.trim().length > 0
  );
}

/**
 * Allowed administrative order transitions.
 *
 * Normal flow:
 *
 * PENDING
 *   ↓
 * CONFIRMED
 *   ↓
 * OUT_FOR_DELIVERY
 *   ↓
 * DELIVERED
 *
 * Cancellation is allowed before delivery,
 * provided payment has not already been collected.
 *
 * We deliberately do not allow:
 *
 * DELIVERED → anything
 * CANCELLED → anything
 * PENDING → DELIVERED
 * CONFIRMED → DELIVERED
 */
function isAllowedTransition(
  current: OrderStatus,
  next: OrderStatus
) {
  if (current === next) {
    return true;
  }

  switch (current) {
    case "PENDING":
      return (
        next === "CONFIRMED" ||
        next === "CANCELLED"
      );

    case "CONFIRMED":
      return (
        next === "OUT_FOR_DELIVERY" ||
        next === "CANCELLED"
      );

    case "OUT_FOR_DELIVERY":
      return next === "DELIVERED";

    case "DELIVERED":
      return false;

    case "CANCELLED":
      return false;

    default:
      return false;
  }
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    /*
     * ---------------------------------------------
     * Admin authorization
     * ---------------------------------------------
     */

    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Route parameter
     * ---------------------------------------------
     */

    const { id } =
      await context.params;

    if (!isValidId(id)) {
      return jsonResponse(
        {
          success: false,
          error: "Order id is required.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Fetch order
     * ---------------------------------------------
     */

    const order =
      await prisma.order.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          orderNumber: true,

          customerId: true,
          customerName: true,
          phone: true,
          address: true,
          landmark: true,
          locality: true,

          notes: true,

          deliverySlotId: true,
          deliverySlotLabel: true,
          deliverySlotStartTime: true,
          deliverySlotEndTime: true,

          subtotal: true,
          deliveryCharge: true,
          total: true,

          paymentMethod: true,
          paymentAccountId: true,
          paymentAccountName: true,
          paymentCollected: true,
          paymentCollectedAt: true,

          status: true,

          createdAt: true,
          updatedAt: true,

          items: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              vegetableId: true,
              name: true,
              quantity: true,
              unitPrice: true,
              total: true,
            },
          },

          deliverySlot: {
            select: {
              id: true,
              label: true,
              startTime: true,
              endTime: true,
              isActive: true,
            },
          },

          paymentAccount: {
            select: {
              id: true,
              name: true,
              qrImageUrl: true,
              isActive: true,
            },
          },
        },
      });

    if (!order) {
      return jsonResponse(
        {
          success: false,
          error: "Order not found.",
        },
        404
      );
    }

    /*
     * ---------------------------------------------
     * Response
     * ---------------------------------------------
     */

    return jsonResponse({
      success: true,

      order: {
        id: order.id,

        orderNumber:
          order.orderNumber,

        customer: {
          id: order.customerId,
          name: order.customerName,
          phone: order.phone,
          address: order.address,
          landmark: order.landmark,
          locality: order.locality,
        },

        notes: order.notes,

        deliverySlot: {
          id: order.deliverySlotId,
          label:
            order.deliverySlotLabel,
          startTime:
            order.deliverySlotStartTime,
          endTime:
            order.deliverySlotEndTime,
          isActive:
            order.deliverySlot.isActive,
        },

        pricing: {
          subtotal:
            order.subtotal.toString(),

          deliveryCharge:
            order.deliveryCharge.toString(),

          total:
            order.total.toString(),
        },

        payment: {
          method:
            order.paymentMethod,

          collected:
            order.paymentCollected,

          collectedAt:
            order.paymentCollectedAt,

          accountId:
            order.paymentAccountId,

          accountName:
            order.paymentAccountName,

          account:
            order.paymentAccount
              ? {
                  id:
                    order.paymentAccount.id,

                  name:
                    order.paymentAccount.name,

                  qrImageUrl:
                    order.paymentAccount
                      .qrImageUrl,

                  isActive:
                    order.paymentAccount
                      .isActive,
                }
              : null,
        },

        status:
          order.status,

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,

        items:
          order.items.map(
            (item) => ({
              id: item.id,

              vegetableId:
                item.vegetableId,

              name: item.name,

              quantity:
                item.quantity.toString(),

              unitPrice:
                item.unitPrice.toString(),

              total:
                item.total.toString(),
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "ADMIN_ORDER_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to load order.",
      },
      500
    );
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
     * Admin authorization
     * ---------------------------------------------
     */

    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Route parameter
     * ---------------------------------------------
     */

    const { id } =
      await context.params;

    if (!isValidId(id)) {
      return jsonResponse(
        {
          success: false,
          error: "Order id is required.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Parse JSON safely
     * ---------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
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
     * Require a JSON object
     * ---------------------------------------------
     */

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
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
     * Explicitly accept ONLY `status`
     *
     * This prevents mass assignment such as:
     *
     * {
     *   status: "DELIVERED",
     *   paymentCollected: true,
     *   total: 1
     * }
     * ---------------------------------------------
     */

    const statusValue =
      "status" in body
        ? (
            body as {
              status?: unknown;
            }
          ).status
        : undefined;

    if (!isValidStatus(statusValue)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid order status.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Read current order state
     * ---------------------------------------------
     */

    const existingOrder =
      await prisma.order.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          orderNumber: true,
          status: true,

          paymentCollected: true,
          paymentMethod: true,
          paymentAccountId: true,
          paymentAccountName: true,
        },
      });

    if (!existingOrder) {
      return jsonResponse(
        {
          success: false,
          error: "Order not found.",
        },
        404
      );
    }

    const currentStatus =
      existingOrder.status as OrderStatus;

    const nextStatus =
      statusValue;

    /*
     * ---------------------------------------------
     * Same-status updates
     * ---------------------------------------------
     */

    if (
      currentStatus === nextStatus
    ) {
      return jsonResponse({
        success: true,

        order: {
          id: existingOrder.id,

          orderNumber:
            existingOrder.orderNumber,

          status:
            existingOrder.status,
        },
      });
    }

    /*
     * ---------------------------------------------
     * Validate status transition
     * ---------------------------------------------
     */

    if (
      !isAllowedTransition(
        currentStatus,
        nextStatus
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            `Cannot change order from ${currentStatus} to ${nextStatus}.`,
        },
        409
      );
    }

    /*
     * ---------------------------------------------
     * Payment must be collected before delivery
     * ---------------------------------------------
     */

    if (
      nextStatus === "DELIVERED" &&
      !existingOrder.paymentCollected
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Payment must be collected before the order can be delivered.",
        },
        409
      );
    }

    /*
     * ---------------------------------------------
     * Paid orders cannot be cancelled
     *
     * Payment collection is handled separately
     * by the delivery/payment workflow.
     * ---------------------------------------------
     */

    if (
      nextStatus === "CANCELLED" &&
      existingOrder.paymentCollected
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "A paid order cannot be cancelled.",
        },
        409
      );
    }

    /*
     * ---------------------------------------------
     * Conditional update
     *
     * The current status is included in the
     * WHERE clause for optimistic concurrency.
     *
     * If another request changes the status
     * between the read and update, zero rows
     * will be affected.
     * ---------------------------------------------
     */

    const updated =
      await prisma.order.updateMany({
        where: {
          id,

          status: currentStatus,
        },

        data: {
          status: nextStatus,
        },
      });

    if (updated.count !== 1) {
      return jsonResponse(
        {
          success: false,
          error:
            "The order changed before it could be updated. Please refresh and try again.",
        },
        409
      );
    }

    /*
     * ---------------------------------------------
     * Fetch final state
     * ---------------------------------------------
     */

    const order =
      await prisma.order.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          orderNumber: true,
          status: true,
          updatedAt: true,
        },
      });

    if (!order) {
      return jsonResponse(
        {
          success: false,
          error: "Order not found.",
        },
        404
      );
    }

    if (
      nextStatus === "CONFIRMED" ||
      nextStatus === "OUT_FOR_DELIVERY" ||
      nextStatus === "DELIVERED"
    ) {
      await sendOrderStatusNotification(order.id, nextStatus);
    }

    /*
     * ---------------------------------------------
     * Success
     * ---------------------------------------------
     */

    return jsonResponse({
      success: true,

      order: {
        id: order.id,

        orderNumber:
          order.orderNumber,

        status:
          order.status,

        updatedAt:
          order.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN_ORDER_STATUS_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to update order status.",
      },
      500
    );
  }
}