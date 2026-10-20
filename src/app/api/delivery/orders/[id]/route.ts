import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireDeliveryBoy } from "@/lib/delivery-auth";
import { isSameOrigin } from "@/lib/csrf";
import { sendOrderStatusNotification } from "@/lib/web-push";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

/*
 * GET
 *
 * Fetch one operational delivery order.
 */
export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const authenticated =
      await requireDeliveryBoy();

    if (!authenticated) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const { id } =
      await context.params;

    if (!id || id.length > 100) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid order.",
        },
        400
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          orderNumber: true,

          customerName: true,
          phone: true,
          address: true,
          landmark: true,
          locality: true,

          deliverySlotLabel: true,
          deliverySlotStartTime: true,
          deliverySlotEndTime: true,

          status: true,

          subtotal: true,
          deliveryCharge: true,
          total: true,

          paymentMethod: true,
          paymentAccountId: true,
          paymentAccountName: true,
          paymentCollected: true,
          paymentCollectedAt: true,

          notes: true,

          createdAt: true,
          updatedAt: true,

          items: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              total: true,
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
     * Delivery boys may only access operational orders.
     */
    if (
      order.status !== "CONFIRMED" &&
      order.status !== "OUT_FOR_DELIVERY" &&
      order.status !== "DELIVERED"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This order is not available for delivery.",
        },
        400
      );
    }

    let paymentAccount = null;

    if (order.paymentAccountId) {
      paymentAccount =
        await prisma.paymentAccount.findUnique(
          {
            where: {
              id: order.paymentAccountId,
            },

            select: {
              id: true,
              name: true,
              qrImageUrl: true,
              isActive: true,
            },
          }
        );
    }

    return jsonResponse({
      success: true,

      order: {
        id: order.id,

        orderNumber:
          order.orderNumber,

        customer: {
          name:
            order.customerName,

          phone:
            order.phone,

          address:
            order.address,

          landmark:
            order.landmark,

          locality:
            order.locality,
        },

        delivery: {
          slot:
            order.deliverySlotLabel,

          startTime:
            order.deliverySlotStartTime,

          endTime:
            order.deliverySlotEndTime,

          status:
            order.status,
        },

        items:
          order.items.map(
            (item) => ({
              id: item.id,

              name:
                item.name,

              quantity:
                item.quantity.toString(),

              unitPrice:
                item.unitPrice.toString(),

              total:
                item.total.toString(),
            })
          ),

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

          accountId:
            order.paymentAccountId,

          accountName:
            order.paymentAccountName,

          collected:
            order.paymentCollected,

          collectedAt:
            order.paymentCollectedAt,

          account:
            paymentAccount
              ? {
                  id:
                    paymentAccount.id,

                  name:
                    paymentAccount.name,

                  qrImageUrl:
                    paymentAccount.qrImageUrl,

                  isActive:
                    paymentAccount.isActive,
                }
              : null,
        },

        notes:
          order.notes,

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "DELIVERY_ORDER_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load delivery order.",
      },
      500
    );
  }
}

/*
 * PATCH
 *
 * Supports:
 *
 * 1. CONFIRMED → OUT_FOR_DELIVERY
 *
 * 2. Collect CASH
 *
 * 3. Collect QR
 *
 * 4. OUT_FOR_DELIVERY → DELIVERED
 *
 * Payment must be collected before delivery.
 */
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    /*
     * ---------------------------------------------
     * CSRF protection
     * ---------------------------------------------
     */

    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * ---------------------------------------------
     * Authentication
     * ---------------------------------------------
     */

    const authenticated =
      await requireDeliveryBoy();

    if (!authenticated) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const { id } =
      await context.params;

    if (!id || id.length > 100) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid order.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Parse request safely
     * ---------------------------------------------
     */

    let rawBody: unknown;

    try {
      rawBody =
        await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request.",
        },
        400
      );
    }

    if (!isPlainObject(rawBody)) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request.",
        },
        400
      );
    }

    const requestedStatus =
      rawBody.status;

    const paymentMethod =
      rawBody.paymentMethod;

    const paymentAccountId =
      rawBody.paymentAccountId;

    /*
     * ---------------------------------------------
     * START DELIVERY
     *
     * CONFIRMED → OUT_FOR_DELIVERY
     * ---------------------------------------------
     */

    if (
      requestedStatus ===
      "OUT_FOR_DELIVERY"
    ) {
      const updatedCount =
        await prisma.order.updateMany({
          where: {
            id,
            status: "CONFIRMED",
          },

          data: {
            status:
              "OUT_FOR_DELIVERY",
          },
        });

      if (updatedCount.count === 0) {
        const currentOrder =
          await prisma.order.findUnique({
            where: {
              id,
            },

            select: {
              status: true,
            },
          });

        if (!currentOrder) {
          return jsonResponse(
            {
              success: false,
              error:
                "Order not found.",
            },
            404
          );
        }

        return jsonResponse(
          {
            success: false,
            error:
              `Cannot start delivery from ${currentOrder.status}.`,
          },
          400
        );
      }

      const updatedOrder =
        await prisma.order.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentMethod: true,
            paymentCollected: true,
            paymentCollectedAt: true,
            updatedAt: true,
          },
        });

      if (!updatedOrder) {
        return jsonResponse(
          {
            success: false,
            error:
              "Order not found.",
          },
          404
        );
      }

      await sendOrderStatusNotification(
        updatedOrder.id,
        "OUT_FOR_DELIVERY"
      );

      return jsonResponse({
        success: true,
        order: updatedOrder,
      });
    }

    /*
     * ---------------------------------------------
     * COLLECT PAYMENT
     * ---------------------------------------------
     */

    if (
      paymentMethod === "CASH" ||
      paymentMethod === "QR"
    ) {
      /*
       * -------------------------------------------
       * CASH
       * -------------------------------------------
       */

      if (
        paymentMethod ===
        "CASH"
      ) {
        const updatedCount =
          await prisma.order.updateMany({
            where: {
              id,
              status:
                "OUT_FOR_DELIVERY",
              paymentCollected:
                false,
            },

            data: {
              paymentMethod:
                "CASH",

              paymentAccountId:
                null,

              paymentAccountName:
                null,

              paymentCollected:
                true,

              paymentCollectedAt:
                new Date(),
            },
          });

        if (
          updatedCount.count === 0
        ) {
          const currentOrder =
            await prisma.order.findUnique(
              {
                where: {
                  id,
                },

                select: {
                  status: true,
                  paymentCollected:
                    true,
                },
              }
            );

          if (!currentOrder) {
            return jsonResponse(
              {
                success: false,
                error:
                  "Order not found.",
              },
              404
            );
          }

          if (
            currentOrder.status !==
            "OUT_FOR_DELIVERY"
          ) {
            return jsonResponse(
              {
                success: false,
                error:
                  "Payment can only be collected while the order is out for delivery.",
              },
              400
            );
          }

          if (
            currentOrder.paymentCollected
          ) {
            return jsonResponse(
              {
                success: false,
                error:
                  "Payment has already been collected for this order.",
              },
              400
            );
          }

          return jsonResponse(
            {
              success: false,
              error:
                "Unable to collect payment.",
            },
            400
          );
        }

        const updatedOrder =
          await prisma.order.findUnique({
            where: {
              id,
            },

            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentMethod: true,
              paymentAccountId: true,
              paymentAccountName: true,
              paymentCollected:
                true,
              paymentCollectedAt:
                true,
              updatedAt: true,
            },
          });

        return jsonResponse({
          success: true,
          order: updatedOrder,
        });
      }

      /*
       * -------------------------------------------
       * QR
       * -------------------------------------------
       */

      if (
        typeof paymentAccountId !==
          "string" ||
        !paymentAccountId.trim() ||
        paymentAccountId.length > 100
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Select a QR receiving account.",
          },
          400
        );
      }

      const trimmedPaymentAccountId =
        paymentAccountId.trim();

      /*
       * Validate the account and collect payment
       * in the same transaction.
       */

      const result =
        await prisma.$transaction(
          async (tx) => {
            const paymentAccount =
              await tx.paymentAccount.findUnique(
                {
                  where: {
                    id:
                      trimmedPaymentAccountId,
                  },

                  select: {
                    id: true,
                    name: true,
                    qrImageUrl: true,
                    isActive: true,
                  },
                }
              );

            if (!paymentAccount) {
              return {
                type:
                  "ACCOUNT_NOT_FOUND" as const,
              };
            }

            if (
              !paymentAccount.isActive
            ) {
              return {
                type:
                  "ACCOUNT_INACTIVE" as const,
              };
            }

            if (
              !paymentAccount.qrImageUrl
            ) {
              return {
                type:
                  "ACCOUNT_NO_QR" as const,
              };
            }

            const updatedCount =
              await tx.order.updateMany({
                where: {
                  id,
                  status:
                    "OUT_FOR_DELIVERY",
                  paymentCollected:
                    false,
                },

                data: {
                  paymentMethod:
                    "QR",

                  paymentAccountId:
                    paymentAccount.id,

                  paymentAccountName:
                    paymentAccount.name,

                  paymentCollected:
                    true,

                  paymentCollectedAt:
                    new Date(),
                },
              });

            if (
              updatedCount.count === 0
            ) {
              const currentOrder =
                await tx.order.findUnique(
                  {
                    where: {
                      id,
                    },

                    select: {
                      status: true,
                      paymentCollected:
                        true,
                    },
                  }
                );

              if (!currentOrder) {
                return {
                  type:
                    "ORDER_NOT_FOUND" as const,
                };
              }

              if (
                currentOrder.status !==
                "OUT_FOR_DELIVERY"
              ) {
                return {
                  type:
                    "NOT_OUT_FOR_DELIVERY" as const,
                };
              }

              if (
                currentOrder.paymentCollected
              ) {
                return {
                  type:
                    "ALREADY_COLLECTED" as const,
                };
              }

              return {
                type:
                  "COLLECTION_FAILED" as const,
              };
            }

            return {
              type: "SUCCESS" as const,
            };
          }
        );

      if (
        result.type ===
        "ACCOUNT_NOT_FOUND"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "QR receiving account not found.",
          },
          404
        );
      }

      if (
        result.type ===
        "ACCOUNT_INACTIVE"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "This QR receiving account is currently inactive.",
          },
          400
        );
      }

      if (
        result.type ===
        "ACCOUNT_NO_QR"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "This QR receiving account does not have a QR image.",
          },
          400
        );
      }

      if (
        result.type ===
        "ORDER_NOT_FOUND"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Order not found.",
          },
          404
        );
      }

      if (
        result.type ===
        "NOT_OUT_FOR_DELIVERY"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Payment can only be collected while the order is out for delivery.",
          },
          400
        );
      }

      if (
        result.type ===
        "ALREADY_COLLECTED"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Payment has already been collected for this order.",
          },
          400
        );
      }

      if (
        result.type ===
        "COLLECTION_FAILED"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Unable to collect payment.",
          },
          400
        );
      }

      const updatedOrder =
        await prisma.order.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentMethod: true,
            paymentAccountId: true,
            paymentAccountName: true,
            paymentCollected:
              true,
            paymentCollectedAt:
              true,
            updatedAt: true,
          },
        });

      return jsonResponse({
        success: true,
        order: updatedOrder,
      });
    }

    /*
     * ---------------------------------------------
     * DELIVER ORDER
     *
     * OUT_FOR_DELIVERY
     * + paymentCollected = true
     * → DELIVERED
     * ---------------------------------------------
     */

    if (
      requestedStatus ===
      "DELIVERED"
    ) {
      const updatedCount =
        await prisma.order.updateMany({
          where: {
            id,
            status:
              "OUT_FOR_DELIVERY",
            paymentCollected:
              true,
          },

          data: {
            status: "DELIVERED",
          },
        });

      if (
        updatedCount.count === 0
      ) {
        const currentOrder =
          await prisma.order.findUnique({
            where: {
              id,
            },

            select: {
              status: true,
              paymentCollected:
                true,
            },
          });

        if (!currentOrder) {
          return jsonResponse(
            {
              success: false,
              error:
                "Order not found.",
            },
            404
          );
        }

        if (
          currentOrder.status !==
          "OUT_FOR_DELIVERY"
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                `Cannot deliver order from ${currentOrder.status}.`,
            },
            400
          );
        }

        if (
          !currentOrder.paymentCollected
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "Payment must be collected before marking the order as delivered.",
            },
            400
          );
        }

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to mark the order as delivered.",
          },
          400
        );
      }

      const updatedOrder =
        await prisma.order.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentMethod: true,
            paymentAccountId: true,
            paymentAccountName: true,
            paymentCollected:
              true,
            paymentCollectedAt:
              true,
            updatedAt: true,
          },
        });

      if (updatedOrder) {
        await sendOrderStatusNotification(
          updatedOrder.id,
          "DELIVERED"
        );
      }

      return jsonResponse({
        success: true,
        order: updatedOrder,
      });
    }

    /*
     * ---------------------------------------------
     * INVALID REQUEST
     * ---------------------------------------------
     */

    return jsonResponse(
      {
        success: false,
        error:
          "Invalid delivery update.",
      },
      400
    );
  } catch (error) {
    console.error(
      "DELIVERY_ORDER_UPDATE_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to update delivery order.",
      },
      500
    );
  }
}