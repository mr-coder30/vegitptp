import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const params = await context.params;

    const orderNumber = params.orderNumber;

    console.log(
      "ORDER NUMBER FROM ROUTE:",
      orderNumber
    );

    console.log(
      "REQUEST URL:",
      request.url
    );

    if (!orderNumber) {
      return NextResponse.json(
        {
          error: "Order number is required.",
        },
        { status: 400 }
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          orderNumber: orderNumber,
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error: "Order not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      order: {
        id: order.id,

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

        status:
          order.status,

        deliverySlot:
          order.deliverySlot,

        createdAt:
          order.createdAt,

        items: order.items.map(
          (item) => ({
            id: item.id,

            vegetableId:
              item.vegetableId,

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
      },
    });
  } catch (error) {
    console.error(
      "ORDER_FETCH_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while fetching the order.",
      },
      { status: 500 }
    );
  }
}