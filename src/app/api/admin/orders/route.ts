import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
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
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        landmark: order.landmark,
        locality: order.locality,
        notes: order.notes,
        deliverySlot: order.deliverySlot,
        subtotal: order.subtotal.toString(),
        deliveryCharge: order.deliveryCharge.toString(),
        total: order.total.toString(),
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          total: item.total.toString(),
        })),
      })),
    });
  } catch (error) {
    console.error("ADMIN_ORDERS_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load orders." },
      { status: 500 }
    );
  }
}