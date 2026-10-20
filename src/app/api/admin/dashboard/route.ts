import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const INDIA_TIME_ZONE = "Asia/Kolkata";

/* -------------------------------------------------------
   INDIA BUSINESS DAY
------------------------------------------------------- */

function getTodayRange() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value
  );

  /*
   * India is UTC+05:30 and does not observe DST.
   *
   * 00:00 IST = previous day 18:30 UTC
   * 00:00 IST of next day = current day 18:30 UTC
   */

  const start = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      -5,
      -30,
      0,
      0
    )
  );

  const nextDayStart = new Date(
    Date.UTC(
      year,
      month - 1,
      day + 1,
      -5,
      -30,
      0,
      0
    )
  );

  const end = new Date(
    nextDayStart.getTime() - 1
  );

  return {
    start,
    end,
  };
}

/* -------------------------------------------------------
   RESPONSES
------------------------------------------------------- */

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized.",
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function errorResponse(
  message: string,
  status = 500
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/* -------------------------------------------------------
   MONEY HELPERS

   Prisma Decimal → integer paise
------------------------------------------------------- */

function decimalToPaise(
  value: {
    toString(): string;
  }
) {
  const raw = value.toString();

  const [rupeesPart, paisePart = ""] =
    raw.split(".");

  const rupees = Number(rupeesPart);

  const paise = Number(
    (paisePart + "00").slice(0, 2)
  );

  return rupees * 100 + paise;
}

function paiseToRupees(
  paise: number
) {
  return paise / 100;
}

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

export async function GET() {
  try {
    /* ---------------------------------------------
       Admin authentication
    --------------------------------------------- */

    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /* ---------------------------------------------
       India business-day range
    --------------------------------------------- */

    const { start, end } =
      getTodayRange();

    /* ---------------------------------------------
       Dashboard queries
    --------------------------------------------- */

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders,

      /*
       * Orders created today.
       *
       * Used for:
       * - today's order count
       * - today's revenue
       * - today's delivered count
       */
      todayOrders,

      /*
       * Orders delivered today.
       *
       * Used for the operational
       * "delivered today" metric.
       */
      todayDeliveredOrders,

      /*
       * Payments actually collected today.
       *
       * IMPORTANT:
       * This uses paymentCollectedAt,
       * NOT createdAt.
       */
      todayCollectedOrders,

      /*
       * Recent activity.
       */
      recentOrders,
    ] = await Promise.all([
      /* ---------------------------------------------
         Overall order counts
      --------------------------------------------- */

      prisma.order.count(),

      prisma.order.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.order.count({
        where: {
          status: "CONFIRMED",
        },
      }),

      prisma.order.count({
        where: {
          status: "OUT_FOR_DELIVERY",
        },
      }),

      prisma.order.count({
        where: {
          status: "DELIVERED",
        },
      }),

      prisma.order.count({
        where: {
          status: "CANCELLED",
        },
      }),

      /* ---------------------------------------------
         Orders created today
      --------------------------------------------- */

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },

        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          paymentMethod: true,
          paymentCollected: true,
          createdAt: true,
          deliverySlotLabel: true,
          deliverySlotStartTime: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      }),

      /* ---------------------------------------------
         Orders delivered today
      --------------------------------------------- */

      prisma.order.findMany({
        where: {
          status: "DELIVERED",

          createdAt: {
            gte: start,
            lte: end,
          },
        },

        select: {
          id: true,
          total: true,
          paymentCollected: true,
          paymentCollectedAt: true,
        },
      }),

      /* ---------------------------------------------
         PAYMENTS COLLECTED TODAY

         This is deliberately based on
         paymentCollectedAt.

         Therefore an order created yesterday
         but delivered and paid today is correctly
         included in today's collection.
      --------------------------------------------- */

      prisma.order.findMany({
        where: {
          paymentCollected: true,

          paymentCollectedAt: {
            gte: start,
            lte: end,
          },
        },

        select: {
          id: true,
          total: true,
          paymentMethod: true,
          paymentCollected: true,
          paymentAccountId: true,
          paymentAccountName: true,
          paymentCollectedAt: true,
        },
      }),

      /* ---------------------------------------------
         Recent orders
      --------------------------------------------- */

      prisma.order.findMany({
        take: 10,

        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          status: true,
          paymentMethod: true,
          paymentCollected: true,
          createdAt: true,
          deliverySlotLabel: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    /* ---------------------------------------------
       TODAY'S REVENUE

       Cancelled orders are excluded.

       Revenue represents orders created today
       that were not cancelled.
    --------------------------------------------- */

    const revenueOrders =
      todayOrders.filter(
        (order) =>
          order.status !== "CANCELLED"
      );

    const todayRevenuePaise =
      revenueOrders.reduce(
        (sum, order) =>
          sum +
          decimalToPaise(
            order.total
          ),
        0
      );

    /* ---------------------------------------------
       TODAY'S COLLECTION

       Collection is based on the actual
       payment collection timestamp.
    --------------------------------------------- */

    const todayCollectedPaise =
      todayCollectedOrders.reduce(
        (sum, order) =>
          sum +
          decimalToPaise(
            order.total
          ),
        0
      );

    /* ---------------------------------------------
       CASH COLLECTION
    --------------------------------------------- */

    const todayCashCollectedPaise =
      todayCollectedOrders
        .filter(
          (order) =>
            order.paymentMethod ===
            "CASH"
        )
        .reduce(
          (sum, order) =>
            sum +
            decimalToPaise(
              order.total
            ),
          0
        );

    /* ---------------------------------------------
       QR COLLECTION
    --------------------------------------------- */

    const todayQrCollectedPaise =
      todayCollectedOrders
        .filter(
          (order) =>
            order.paymentMethod ===
            "QR"
        )
        .reduce(
          (sum, order) =>
            sum +
            decimalToPaise(
              order.total
            ),
          0
        );

    /* ---------------------------------------------
       TODAY'S UNCOLLECTED DELIVERED ORDERS

       These are orders delivered today but
       still marked as unpaid.

       This is intentionally separate from
       today's actual collection.
    --------------------------------------------- */

    const todayUncollectedPaise =
      todayDeliveredOrders
        .filter(
          (order) =>
            !order.paymentCollected
        )
        .reduce(
          (sum, order) =>
            sum +
            decimalToPaise(
              order.total
            ),
          0
        );

    /* ---------------------------------------------
       QR ACCOUNT BREAKDOWN

       Uses the payment-account snapshot stored
       on the order.

       Historical payments therefore remain
       associated with the account that actually
       received them, even if the account is later
       renamed or deleted.
    --------------------------------------------- */

    const qrAccountMap =
      new Map<
        string,
        {
          id: string | null;
          name: string;
          amountPaise: number;
          orders: number;
        }
      >();

    for (
      const order of todayCollectedOrders
    ) {
      if (
        order.paymentMethod !==
        "QR"
      ) {
        continue;
      }

      const key =
        order.paymentAccountId ??
        "unknown";

      const existing =
        qrAccountMap.get(key);

      if (existing) {
        existing.amountPaise +=
          decimalToPaise(
            order.total
          );

        existing.orders += 1;
      } else {
        qrAccountMap.set(
          key,
          {
            id:
              order.paymentAccountId,

            name:
              order.paymentAccountName ??
              "Unknown QR account",

            amountPaise:
              decimalToPaise(
                order.total
              ),

            orders: 1,
          }
        );
      }
    }

    const qrAccounts =
      Array.from(
        qrAccountMap.values()
      )
        .sort(
          (a, b) =>
            b.amountPaise -
            a.amountPaise
        )
        .map((account) => ({
          id: account.id,

          name: account.name,

          amount:
            paiseToRupees(
              account.amountPaise
            ),

          orders:
            account.orders,
        }));

    /* ---------------------------------------------
       RESPONSE
    --------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        /* -----------------------------------------
           OVERVIEW
        ----------------------------------------- */

        overview: {
          totalOrders,
          pendingOrders,
          confirmedOrders,
          outForDeliveryOrders,
          deliveredOrders,
          cancelledOrders,
        },

        /* -----------------------------------------
           TODAY
        ----------------------------------------- */

        today: {
          orderCount:
            todayOrders.length,

          deliveredOrderCount:
            todayDeliveredOrders.length,

          revenue:
            paiseToRupees(
              todayRevenuePaise
            ),

          collected:
            paiseToRupees(
              todayCollectedPaise
            ),

          cashCollected:
            paiseToRupees(
              todayCashCollectedPaise
            ),

          qrCollected:
            paiseToRupees(
              todayQrCollectedPaise
            ),

          uncollected:
            paiseToRupees(
              todayUncollectedPaise
            ),
        },

        /* -----------------------------------------
           QR ACCOUNT BREAKDOWN
        ----------------------------------------- */

        qrAccounts,

        /* -----------------------------------------
           TODAY'S ORDERS

           Only fields actually needed by the
           dashboard UI are returned.
        ----------------------------------------- */

        todayOrders:
          todayOrders.map(
            (order) => ({
              id: order.id,

              orderNumber:
                order.orderNumber,

              customerName:
                order.customerName,

              total:
                paiseToRupees(
                  decimalToPaise(
                    order.total
                  )
                ),

              status:
                order.status,

              paymentMethod:
                order.paymentMethod,

              paymentCollected:
                order.paymentCollected,

              createdAt:
                order.createdAt,

              deliverySlot: {
                label:
                  order.deliverySlotLabel,

                startTime:
                  order.deliverySlotStartTime,
              },
            })
          ),

        /* -----------------------------------------
           RECENT ORDERS
        ----------------------------------------- */

        recentOrders:
          recentOrders.map(
            (order) => ({
              id: order.id,

              orderNumber:
                order.orderNumber,

              customerName:
                order.customerName,

              total:
                paiseToRupees(
                  decimalToPaise(
                    order.total
                  )
                ),

              status:
                order.status,

              paymentMethod:
                order.paymentMethod,

              paymentCollected:
                order.paymentCollected,

              createdAt:
                order.createdAt,

              deliverySlot:
                order.deliverySlotLabel,
            })
          ),
      },

      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "ADMIN_DASHBOARD_GET_ERROR:",
      error
    );

    return errorResponse(
      "Unable to load admin dashboard.",
      500
    );
  }
}