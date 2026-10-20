import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const runningStatuses = [
  "PENDING",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
] as const;

const MAX_SEARCH_LENGTH = 100;

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

/**
 * Convert a Prisma Decimal monetary value
 * into integer paise.
 *
 * Prisma Decimal performs the multiplication
 * before converting to a JavaScript number,
 * avoiding floating-point arithmetic during
 * the currency calculation.
 */
function toPaise(value: {
  mul: (factor: number) => {
    toNumber: () => number;
  };
}) {
  const paise =
    value.mul(100).toNumber();

  if (
    !Number.isFinite(paise) ||
    !Number.isSafeInteger(paise)
  ) {
    throw new Error(
      "Invalid monetary value."
    );
  }

  return paise;
}

function fromPaise(
  value: number
) {
  return value / 100;
}

export async function GET(
  request: NextRequest
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
     * Read search parameter
     * ---------------------------------------------
     */

    const { searchParams } =
      new URL(request.url);

    const rawSearch =
      searchParams.get("search");

    const search =
      rawSearch && rawSearch.trim()
        ? rawSearch.trim()
        : null;

    /*
     * ---------------------------------------------
     * Validate search length
     * ---------------------------------------------
     */

    if (
      search &&
      search.length > MAX_SEARCH_LENGTH
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Search query is too long.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Fetch customers
     *
     * Explicitly select only the customer fields
     * required by the admin UI.
     * ---------------------------------------------
     */

    const customers =
      await prisma.customer.findMany({
        where: search
          ? {
              OR: [
                  {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    phone: {
                      contains: search,
                    },
                  },
                  {
                    locality: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
            }
          : undefined,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          landmark: true,
          locality: true,
          createdAt: true,
          updatedAt: true,

          orders: {
            orderBy: {
              createdAt: "desc",
            },

            select: {
              id: true,
              orderNumber: true,

              subtotal: true,
              deliveryCharge: true,
              total: true,

              status: true,

              address: true,
              landmark: true,
              locality: true,

              deliverySlotLabel:
                true,
              deliverySlotStartTime:
                true,
              deliverySlotEndTime:
                true,

              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    /*
     * ---------------------------------------------
     * Build admin customer response
     * ---------------------------------------------
     */

    const data = customers.map(
      (customer) => {
        const totalOrders =
          customer.orders.filter(
            (order) => order.status !== "CANCELLED"
          ).length;

        /*
         * Calculate total spending in paise.
         *
         * Cancelled orders are excluded.
         */

        let totalSpentPaise = 0;

        for (
          const order of customer.orders
        ) {
          if (
            order.status ===
            "CANCELLED"
          ) {
            continue;
          }

          totalSpentPaise +=
            toPaise(order.total);
        }

        /*
         * Find the current running order.
         *
         * Orders are already sorted newest-first,
         * so the first matching order is the
         * current running order.
         */

        const runningOrder =
          customer.orders.find(
            (order) =>
              runningStatuses.includes(
                order.status as
                  (typeof runningStatuses)[number]
              )
          ) ?? null;

        /*
         * Most recent order.
         */

        const lastOrder =
          customer.orders[0] ??
          null;

        return {
          id: customer.id,

          name: customer.name,
          phone: customer.phone,

          address:
            customer.address,

          landmark:
            customer.landmark,

          locality:
            customer.locality,

          createdAt:
            customer.createdAt,

          updatedAt:
            customer.updatedAt,

          totalOrders,

          totalSpent:
            fromPaise(
              totalSpentPaise
            ),

          /*
           * -----------------------------------------
           * Current running order
           * -----------------------------------------
           */

          runningOrder:
            runningOrder
              ? {
                  id:
                    runningOrder.id,

                  orderNumber:
                    runningOrder.orderNumber,

                  subtotal:
                    runningOrder.subtotal
                      .toString(),

                  deliveryCharge:
                    runningOrder
                      .deliveryCharge
                      .toString(),

                  total:
                    fromPaise(toPaise(runningOrder.total)),

                  status:
                    runningOrder.status,

                  delivery: {
                    label:
                      runningOrder
                        .deliverySlotLabel,

                    startTime:
                      runningOrder
                        .deliverySlotStartTime,

                    endTime:
                      runningOrder
                        .deliverySlotEndTime,
                  },

                  address:
                    runningOrder.address,

                  landmark:
                    runningOrder.landmark,

                  locality:
                    runningOrder.locality,

                  createdAt:
                    runningOrder.createdAt,

                  updatedAt:
                    runningOrder.updatedAt,
                }
              : null,

          /*
           * -----------------------------------------
           * Most recent order summary
           * -----------------------------------------
           */

          lastOrder:
            lastOrder
              ? {
                  id:
                    lastOrder.id,

                  orderNumber:
                    lastOrder.orderNumber,

                  total:
                    fromPaise(toPaise(lastOrder.total)),

                  status:
                    lastOrder.status,

                  deliverySlot:
                    lastOrder
                      .deliverySlotLabel,

                  createdAt:
                    lastOrder.createdAt,
                }
              : null,

          /*
           * -----------------------------------------
           * Complete order history
           * -----------------------------------------
           */

          orders:
            customer.orders.map(
              (order) => ({
                id: order.id,

                orderNumber:
                  order.orderNumber,

                subtotal:
                  order.subtotal
                    .toString(),

                deliveryCharge:
                  order.deliveryCharge
                    .toString(),

                total:
                  fromPaise(toPaise(order.total)),

                status:
                  order.status,

                deliverySlot:
                  order
                    .deliverySlotLabel,

                deliverySlotStartTime:
                  order
                    .deliverySlotStartTime,

                deliverySlotEndTime:
                  order
                    .deliverySlotEndTime,

                createdAt:
                  order.createdAt,

                updatedAt:
                  order.updatedAt,
              })
            ),
        };
      }
    );

    /*
     * ---------------------------------------------
     * Success
     * ---------------------------------------------
     */

    return jsonResponse({
      success: true,

      filters: {
        search,
      },

      customers: data,
    });
  } catch (error) {
    /*
     * Never expose internal/database details.
     */

    console.error(
      "ADMIN_CUSTOMERS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load customers.",
      },
      500
    );
  }
}