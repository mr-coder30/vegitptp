import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const VALID_METHODS = ["CASH", "QR"] as const;

type PaymentMethod =
  (typeof VALID_METHODS)[number];

const MAX_DATE_LENGTH = 10;
const MAX_ACCOUNT_ID_LENGTH = 100;

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

function isValidMethod(
  value: string | null
): value is PaymentMethod {
  return (
    value !== null &&
    VALID_METHODS.includes(
      value as PaymentMethod
    )
  );
}

/**
 * Accepts only YYYY-MM-DD.
 *
 * The business operates in India, so the date is
 * interpreted using Asia/Kolkata instead of relying
 * on the server timezone.
 */
function getDateRange(
  date: string | null
) {
  if (!date) {
    return null;
  }

  if (date.length !== MAX_DATE_LENGTH) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
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
   * Rejects values such as:
   * 2026-02-31
   */
  const calendarCheck = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    calendarCheck.getUTCFullYear() !==
      year ||
    calendarCheck.getUTCMonth() !==
      month - 1 ||
    calendarCheck.getUTCDate() !==
      day
  ) {
    return null;
  }

  /*
   * Asia/Kolkata is UTC+05:30.
   *
   * Example:
   * 2026-10-06 00:00 IST
   * =
   * 2026-10-05 18:30 UTC
   */
  const start = new Date(
    `${date}T00:00:00+05:30`
  );

  const end = new Date(
    `${date}T00:00:00+05:30`
  );

  end.setUTCDate(
    end.getUTCDate() + 1
  );

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

function isValidAccountId(
  value: string | null
): value is string {
  return (
    value !== null &&
    value.length > 0 &&
    value.length <=
      MAX_ACCOUNT_ID_LENGTH
  );
}

/**
 * Convert money into integer paise before
 * calculations.
 *
 * This avoids accumulating floating-point
 * rounding errors during addition.
 */
function toPaise(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

function fromPaise(value: number) {
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
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    /*
     * ---------------------------------------------
     * Read query parameters
     * ---------------------------------------------
     */

    const { searchParams } =
      new URL(request.url);

    const rawDate =
      searchParams.get("date");

    const rawMethod =
      searchParams.get("method");

    const rawAccountId =
      searchParams.get("accountId");

    /*
     * Normalize empty parameters.
     */

    const date =
      rawDate && rawDate.trim()
        ? rawDate.trim()
        : null;

    const method =
      rawMethod && rawMethod.trim()
        ? rawMethod.trim()
        : null;

    const accountId =
      rawAccountId &&
      rawAccountId.trim()
        ? rawAccountId.trim()
        : null;

    /*
     * ---------------------------------------------
     * Validate date
     * ---------------------------------------------
     */

    const dateRange =
      getDateRange(date);

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
     * ---------------------------------------------
     * Validate payment method
     * ---------------------------------------------
     */

    if (
      method &&
      !isValidMethod(method)
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid payment method.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Validate payment account ID
     * ---------------------------------------------
     */

    if (
      accountId &&
      !isValidAccountId(accountId)
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid payment account.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Account filters are QR-only
     *
     * Reject:
     *
     * method=CASH&accountId=...
     *
     * Also, when accountId is provided without
     * method, the query is explicitly treated
     * as a QR query below.
     * ---------------------------------------------
     */

    if (
      accountId &&
      method &&
      method !== "QR"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "A QR account can only be used with QR payments.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Verify requested account exists
     * ---------------------------------------------
     */

    if (accountId) {
      const paymentAccount =
        await prisma.paymentAccount.findUnique(
          {
            where: {
              id: accountId,
            },

            select: {
              id: true,
            },
          }
        );

      if (!paymentAccount) {
        return jsonResponse(
          {
            success: false,
            error:
              "Payment account not found.",
          },
          404
        );
      }
    }

    /*
     * ---------------------------------------------
     * Build collected-payment filter
     * ---------------------------------------------
     *
     * Only actually collected payments are
     * included in the collected totals.
     * ---------------------------------------------
     */

    const where: {
      paymentCollected: true;

      paymentCollectedAt?: {
        gte: Date;
        lt: Date;
      };

      paymentMethod?: PaymentMethod;

      paymentAccountId?: string;
    } = {
      paymentCollected: true,
    };

    /*
     * Date filters use paymentCollectedAt,
     * because this is a payment report.
     */

    if (dateRange) {
      where.paymentCollectedAt = {
        gte: dateRange.start,
        lt: dateRange.end,
      };
    }

    /*
     * Explicit payment method filter.
     */

    if (method) {
      if (!isValidMethod(method)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid payment method.",
          },
          400
        );
      }

      where.paymentMethod = method;
    }

    /*
     * Account filter.
     *
     * Supplying an account automatically makes
     * this a QR payment query.
     */

    if (accountId) {
      where.paymentAccountId =
        accountId;

      where.paymentMethod = "QR";
    }

    /*
     * ---------------------------------------------
     * Fetch collected payments + available
     * payment accounts
     * ---------------------------------------------
     */

    const [
      payments,
      paymentAccounts,
    ] = await Promise.all([
      prisma.order.findMany({
        where,

        orderBy: [
          {
            paymentCollectedAt:
              "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        select: {
          id: true,
          orderNumber: true,

          customerName: true,
          phone: true,

          total: true,

          status: true,

          paymentMethod: true,
          paymentAccountId: true,
          paymentAccountName: true,

          paymentCollected: true,
          paymentCollectedAt: true,

          createdAt: true,

          deliverySlotLabel: true,
        },
      }),

      prisma.paymentAccount.findMany({
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],

        select: {
          id: true,
          name: true,
          isActive: true,
          sortOrder: true,
        },
      }),
    ]);

    /*
     * ---------------------------------------------
     * Calculate collected totals
     * ---------------------------------------------
     */

    let totalCollectedPaise = 0;
    let cashCollectedPaise = 0;
    let qrCollectedPaise = 0;

    let cashOrders = 0;
    let qrOrders = 0;

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

    for (const payment of payments) {
      const amountPaise =
        toPaise(payment.total);

      totalCollectedPaise +=
        amountPaise;

      if (
        payment.paymentMethod ===
        "CASH"
      ) {
        cashCollectedPaise +=
          amountPaise;

        cashOrders += 1;

        continue;
      }

      if (
        payment.paymentMethod ===
        "QR"
      ) {
        qrCollectedPaise +=
          amountPaise;

        qrOrders += 1;

        const key =
          payment.paymentAccountId ??
          "unknown";

        const existing =
          qrAccountMap.get(key);

        if (existing) {
          existing.amountPaise +=
            amountPaise;

          existing.orders += 1;
        } else {
          qrAccountMap.set(
            key,
            {
              id:
                payment.paymentAccountId,

              name:
                payment.paymentAccountName ??
                "Unknown QR account",

              amountPaise,

              orders: 1,
            }
          );
        }
      }
    }

    /*
     * ---------------------------------------------
     * QR account totals
     * ---------------------------------------------
     */

    const qrAccountTotals =
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

          amount: fromPaise(
            account.amountPaise
          ),

          orders:
            account.orders,
        }));

    /*
     * ---------------------------------------------
     * Delivered orders with uncollected payment
     * ---------------------------------------------
     *
     * Under the normal delivery workflow,
     * an order should not become DELIVERED
     * without payment being collected.
     *
     * This query is intentionally retained as
     * a safety/reporting mechanism for legacy,
     * inconsistent, or manually-created data.
     *
     * When a date filter is selected, createdAt
     * is used because paymentCollectedAt is null.
     * ---------------------------------------------
     */

    const uncollectedWhere: {
      status: "DELIVERED";

      paymentCollected: false;

      createdAt?: {
        gte: Date;
        lt: Date;
      };
    } = {
      status: "DELIVERED",
      paymentCollected: false,
    };

    if (dateRange) {
      uncollectedWhere.createdAt = {
        gte: dateRange.start,
        lt: dateRange.end,
      };
    }

    const uncollectedOrders =
      await prisma.order.findMany({
        where: uncollectedWhere,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          orderNumber: true,

          customerName: true,
          phone: true,

          total: true,

          paymentMethod: true,
          paymentAccountName: true,

          createdAt: true,
        },
      });

    /*
     * ---------------------------------------------
     * Calculate uncollected total
     * ---------------------------------------------
     */

    const uncollectedAmountPaise =
      uncollectedOrders.reduce(
        (sum, order) =>
          sum +
          toPaise(order.total),
        0
      );

    /*
     * ---------------------------------------------
     * Response
     * ---------------------------------------------
     */

    return jsonResponse({
      success: true,

      filters: {
        date,
        method,
        accountId,
      },

      summary: {
        totalCollected:
          fromPaise(
            totalCollectedPaise
          ),

        cashCollected:
          fromPaise(
            cashCollectedPaise
          ),

        qrCollected:
          fromPaise(
            qrCollectedPaise
          ),

        cashOrders,

        qrOrders,

        totalPayments:
          payments.length,

        uncollectedAmount:
          fromPaise(
            uncollectedAmountPaise
          ),

        uncollectedOrders:
          uncollectedOrders.length,
      },

      qrAccountTotals,

      /*
       * Only fields required by the
       * admin UI.
       */

      paymentAccounts,

      payments:
        payments.map(
          (payment) => ({
            id: payment.id,

            orderNumber:
              payment.orderNumber,

            customer: {
              name:
                payment.customerName,

              phone:
                payment.phone,
            },

            amount:
              payment.total.toString(),

            status:
              payment.status,

            method:
              payment.paymentMethod,

            account:
              payment.paymentAccountId
                ? {
                    id:
                      payment.paymentAccountId,

                    name:
                      payment.paymentAccountName,
                  }
                : null,

            collected:
              payment.paymentCollected,

            collectedAt:
              payment.paymentCollectedAt,

            createdAt:
              payment.createdAt,

            deliverySlot:
              payment.deliverySlotLabel,
          })
        ),

      uncollected:
        uncollectedOrders.map(
          (order) => ({
            id: order.id,

            orderNumber:
              order.orderNumber,

            customer: {
              name:
                order.customerName,

              phone:
                order.phone,
            },

            amount:
              order.total.toString(),

            method:
              order.paymentMethod,

            account:
              order.paymentAccountName,

            createdAt:
              order.createdAt,
          })
        ),
    });
  } catch (error) {
    /*
     * Never expose database or internal
     * implementation details to the client.
     */

    console.error(
      "ADMIN_PAYMENTS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load payment information.",
      },
      500
    );
  }
}