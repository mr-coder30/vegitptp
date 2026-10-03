import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const phone = searchParams.get("phone")?.trim();

    if (!phone) {
      return NextResponse.json(
        {
          error: "Phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        {
          error: "Invalid phone number.",
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        phone,
      },
    });

    if (!customer) {
      return NextResponse.json({
        success: true,
        orders: [],
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,

      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,

        status: order.status,

        deliverySlot: order.deliverySlot,

        subtotal: order.subtotal.toString(),

        deliveryCharge:
          order.deliveryCharge.toString(),

        total: order.total.toString(),

        paymentMethod:
          order.paymentMethod,

        createdAt:
          order.createdAt,

        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity:
            item.quantity.toString(),
          unitPrice:
            item.unitPrice.toString(),
          total:
            item.total.toString(),
        })),
      })),
    });
  } catch (error) {
    console.error(
      "CUSTOMER_ORDERS_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load orders.",
      },
      { status: 500 }
    );
  }
}