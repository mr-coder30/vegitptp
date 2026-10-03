import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const validStatuses = [
  "PENDING",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

type OrderStatus = (typeof validStatuses)[number];

function isValidStatus(
  value: unknown
): value is OrderStatus {
  return (
    typeof value === "string" &&
    validStatuses.includes(value as OrderStatus)
  );
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!isValidStatus(body?.status)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status: body.status,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("ADMIN_ORDER_STATUS_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to update order status." },
      { status: 500 }
    );
  }
}