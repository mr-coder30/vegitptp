import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";

type RouteContext = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    /*
     * --------------------------------------------------
     * 1. Authenticate customer
     * --------------------------------------------------
     */

    const authenticatedCustomer =
      await getAuthenticatedCustomer();

    if (!authenticatedCustomer) {
      return NextResponse.json(
        {
          error:
            "Please login to view this order.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * --------------------------------------------------
     * 2. Read and validate order number
     * --------------------------------------------------
     */

    const params = await context.params;

    const orderNumber =
      typeof params.orderNumber === "string"
        ? params.orderNumber.trim()
        : "";

    if (
      !orderNumber ||
      orderNumber.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Order number is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * --------------------------------------------------
     * 3. Fetch ONLY this customer's order
     * --------------------------------------------------
     *
     * The customer ID comes from the authenticated
     * server-side session, never from the browser.
     *
     * This prevents one customer from viewing another
     * customer's order by changing the order number.
     *
     * Only fields required by the customer-facing
     * order page are selected from the database.
     * --------------------------------------------------
     */

    const order =
      await prisma.order.findFirst({
        where: {
          orderNumber,
          customerId:
            authenticatedCustomer.id,
        },

        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          phone: true,
          address: true,
          landmark: true,
          locality: true,
          subtotal: true,
          deliveryCharge: true,
          total: true,
          paymentMethod: true,
          paymentCollected: true,
          status: true,
          deliverySlotLabel: true,
          createdAt: true,

          items: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              vegetableId: true,
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

    if (!order) {
      return NextResponse.json(
        {
          error: "Order not found.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * --------------------------------------------------
     * 4. Return order
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        order: {
          id:
            order.id,

          orderNumber:
            order.orderNumber,

          customerName:
            order.customerName,

          phone:
            order.phone,

          address:
            order.address,

          landmark:
            order.landmark,

          locality:
            order.locality,

          subtotal:
            order.subtotal.toString(),

          deliveryCharge:
            order.deliveryCharge.toString(),

          total:
            order.total.toString(),

          paymentMethod:
            order.paymentMethod,

          paymentCollected:
            order.paymentCollected,

          status:
            order.status,

          /*
           * Historical delivery slot snapshot.
           */
          deliverySlot:
            order.deliverySlotLabel,

          createdAt:
            order.createdAt,

          items:
            order.items.map(
              (item) => ({
                id:
                  item.id,

                vegetableId:
                  item.vegetableId,

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
        },
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
    /*
     * Do not expose internal database/provider
     * errors to the customer.
     */

    console.error(
      "ORDER_FETCH_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while fetching the order.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}