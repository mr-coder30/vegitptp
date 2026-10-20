import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireDeliveryBoy } from "@/lib/delivery-auth";

const INDIA_TIME_ZONE = "Asia/Kolkata";

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

/**
 * Returns the UTC Date representing midnight
 * at the start of the current calendar day in
 * Asia/Kolkata.
 */
function getStartOfTodayInIndia() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          INDIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const year = Number(
    parts.find(
      (part) =>
        part.type === "year"
    )?.value
  );

  const month = Number(
    parts.find(
      (part) =>
        part.type === "month"
    )?.value
  );

  const day = Number(
    parts.find(
      (part) =>
        part.type === "day"
    )?.value
  );

  /*
   * Asia/Kolkata is UTC+05:30.
   *
   * Constructing UTC midnight for the Indian
   * calendar day means subtracting 5h30m.
   */
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    ) -
      5.5 * 60 * 60 * 1000
  );
}

export async function GET() {
  try {
    /*
     * -----------------------------------------------
     * 1. Authenticate delivery boy
     * -----------------------------------------------
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

    /*
     * -----------------------------------------------
     * 2. Build today's boundaries in IST
     * -----------------------------------------------
     */

    const startOfToday =
      getStartOfTodayInIndia();

    const startOfTomorrow =
      new Date(
        startOfToday.getTime() +
          24 * 60 * 60 * 1000
      );

    /*
     * -----------------------------------------------
     * 3. Fetch operational orders
     * -----------------------------------------------
     *
     * CONFIRMED
     *     → always included
     *
     * OUT_FOR_DELIVERY
     *     → always included
     *
     * DELIVERED
     *     → only today's delivered orders
     *
     * This keeps unfinished work visible while
     * preventing old completed orders from filling
     * the delivery dashboard.
     */

    const orders =
      await prisma.order.findMany({
        where: {
          OR: [
            {
              status: "CONFIRMED",
            },

            {
              status:
                "OUT_FOR_DELIVERY",
            },

            {
              status: "DELIVERED",

              paymentCollectedAt: {
                gte: startOfToday,
                lt: startOfTomorrow,
              },
            },
          ],
        },

        orderBy: [
          {
            deliverySlotStartTime:
              "asc",
          },

          {
            createdAt: "asc",
          },
        ],

        select: {
          id: true,
          orderNumber: true,

          customerName: true,
          phone: true,
          address: true,
          landmark: true,
          locality: true,

          deliverySlotLabel: true,
          deliverySlotStartTime:
            true,
          deliverySlotEndTime:
            true,

          status: true,

          subtotal: true,
          deliveryCharge: true,
          total: true,

          paymentMethod: true,
          paymentCollected: true,
          paymentCollectedAt: true,
          paymentAccountId: true,
          paymentAccountName: true,

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

          paymentAccount: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    /*
     * -----------------------------------------------
     * 4. Return delivery-safe data
     * -----------------------------------------------
     */

    return jsonResponse({
      success: true,

      orders:
        orders.map((order) => ({
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

          payment: {
            method:
              order.paymentMethod,

            subtotal:
              order.subtotal.toString(),

            deliveryCharge:
              order.deliveryCharge.toString(),

            total:
              order.total.toString(),

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
                      order.paymentAccount
                        .id,

                    name:
                      order.paymentAccount
                        .name,
                  }
                : null,
          },

          notes:
            order.notes,

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

          createdAt:
            order.createdAt,

          updatedAt:
            order.updatedAt,
        })),
    });
  } catch (error) {
    console.error(
      "DELIVERY_ORDERS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load delivery orders.",
      },
      500
    );
  }
}