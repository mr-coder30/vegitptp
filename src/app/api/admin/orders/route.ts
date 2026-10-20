import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

type OrderStatus =
  (typeof VALID_STATUSES)[number];

const MAX_DATE_LENGTH = 10;
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

function isValidStatus(
  value: string | null
): value is OrderStatus {
  return (
    value !== null &&
    VALID_STATUSES.includes(
      value as OrderStatus
    )
  );
}

/**
 * Creates a date range for one calendar day in
 * Asia/Kolkata.
 *
 * Example:
 * 2026-10-06
 *
 * means:
 * 2026-10-06 00:00 IST
 * through
 * 2026-10-07 00:00 IST
 */
function getDateRange(date: string | null) {
  if (!date) {
    return null;
  }

  if (date.length !== MAX_DATE_LENGTH) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const [
    yearString,
    monthString,
    dayString,
  ] = date.split("-");

  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  /*
   * Validate the actual calendar date.
   *
   * This rejects values such as:
   * 2026-02-31
   */
  const calendarCheck = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return null;
  }

  const start = new Date(
    `${date}T00:00:00+05:30`
  );

  const end = new Date(
    `${date}T00:00:00+05:30`
  );

  end.setUTCDate(end.getUTCDate() + 1);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  return {
    start,
    end,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * Admin authorization
     */
    const authenticated = await requireAdmin();

    if (!authenticated) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const { searchParams } =
      new URL(request.url);

    /*
     * Normalize query parameters.
     */
    const rawDate = searchParams.get("date");
    const rawStatus =
      searchParams.get("status");
    const rawSearch =
      searchParams.get("search");

    const date =
      rawDate && rawDate.trim()
        ? rawDate.trim()
        : null;

    const status =
      rawStatus && rawStatus.trim()
        ? rawStatus.trim()
        : null;

    const search =
      rawSearch && rawSearch.trim()
        ? rawSearch.trim()
        : null;

    /*
     * Validate date.
     */
    const dateRange = getDateRange(date);

    if (date && !dateRange) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid date.",
        },
        400
      );
    }

    /*
     * Validate status.
     */
    if (
      status &&
      !isValidStatus(status)
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid order status.",
        },
        400
      );
    }

    /*
     * Limit search input.
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
     * Build the Prisma filter.
     */
    const where: {
      createdAt?: {
        gte: Date;
        lt: Date;
      };

      status?: OrderStatus;

      OR?: Array<{
        orderNumber?: {
          contains: string;
          mode: "insensitive";
        };

        customerName?: {
          contains: string;
          mode: "insensitive";
        };

        phone?: {
          contains: string;
        };
      }>;
    } = {};

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lt: dateRange.end,
      };
    }

    if (status) {
      where.status =
        status as OrderStatus;
    }

    if (search) {
      where.OR = [
        {
          orderNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          customerName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
          },
        },
      ];
    }

    /*
     * Fetch only the fields required by the
     * admin orders UI.
     */
    const orders =
      await prisma.order.findMany({
        where,

        orderBy: {
          createdAt: "desc",
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
        },
      });

    return jsonResponse({
      success: true,

      filters: {
        date,
        status,
        search,
      },

      orders: orders.map(
        (order) => ({
          id: order.id,

          orderNumber:
            order.orderNumber,

          customer: {
            id: order.customerId,
            name:
              order.customerName,
            phone: order.phone,
            address:
              order.address,
            landmark:
              order.landmark,
            locality:
              order.locality,
          },

          notes: order.notes,

          deliverySlot: {
            id:
              order.deliverySlotId,
            label:
              order.deliverySlotLabel,
            startTime:
              order.deliverySlotStartTime,
            endTime:
              order.deliverySlotEndTime,
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
        })
      ),
    });
  } catch (error) {
    /*
     * Log the internal error server-side,
     * but never expose database/internal
     * details to the client.
     */
    console.error(
      "ADMIN_ORDERS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to load orders.",
      },
      500
    );
  }
}