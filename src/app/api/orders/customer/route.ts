import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

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

export async function GET() {
  try {
    /*
     * --------------------------------------------------
     * 1. Authenticate customer
     * --------------------------------------------------
     *
     * Customer identity comes exclusively from
     * the authenticated HttpOnly session cookie.
     * --------------------------------------------------
     */

    const authenticatedCustomer =
      await getAuthenticatedCustomer();

    if (!authenticatedCustomer) {
      return jsonResponse(
        {
          error:
            "Please login to view your orders.",
        },
        401
      );
    }

    /*
     * --------------------------------------------------
     * 2. Fetch only authenticated customer's orders
     * --------------------------------------------------
     *
     * The customer ID is taken from the server-side
     * authenticated session.
     *
     * No customer ID is accepted from the browser.
     *
     * Only fields required by the customer-facing
     * orders page are selected.
     * --------------------------------------------------
     */

    const orders =
      await prisma.order.findMany({
        where: {
          customerId:
            authenticatedCustomer.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          orderNumber: true,
          status: true,

          deliverySlotId: true,
          deliverySlotLabel: true,
          deliverySlotStartTime: true,
          deliverySlotEndTime: true,

          subtotal: true,
          deliveryCharge: true,
          total: true,

          paymentMethod: true,
          createdAt: true,

          items: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              name: true,
              vegetable: {
                select: {
                  nameEn: true,
                  nameTe: true,
                },
              },
              quantity: true,
              unitPrice: true,
              total: true,
            },
          },
        },
      });

    /*
     * --------------------------------------------------
     * 3. Return safe order data
     * --------------------------------------------------
     *
     * We intentionally use the delivery-slot snapshot
     * stored on the order.
     *
     * This means an admin can later edit a delivery slot
     * without changing the information shown for an
     * already-created order.
     * --------------------------------------------------
     */

    return jsonResponse({
      success: true,

      orders: orders.map((order) => ({
        id: order.id,

        orderNumber:
          order.orderNumber,

        status:
          order.status,

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

        subtotal:
          order.subtotal.toString(),

        deliveryCharge:
          order.deliveryCharge.toString(),

        total:
          order.total.toString(),

        paymentMethod:
          order.paymentMethod,

        createdAt:
          order.createdAt,

        items:
          order.items.map(
            (item) => ({
              id: item.id,

              name:
                item.name,

              nameEn:
                item.vegetable.nameEn,

              nameTe:
                item.vegetable.nameTe,

              quantity:
                item.quantity.toString(),

              unitPrice:
                item.unitPrice.toString(),

              total:
                item.total.toString(),
            })
          ),
      })),
    });
  } catch (error) {
    console.error(
      "CUSTOMER_ORDERS_ERROR:",
      error
    );

    return jsonResponse(
      {
        error:
          "Unable to load orders.",
      },
      500
    );
  }
}