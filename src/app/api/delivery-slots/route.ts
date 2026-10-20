import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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
    const slots =
      await prisma.deliverySlot.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          startTime: true,
          endTime: true,
        },
      });

    return jsonResponse({
      success: true,
      slots,
    });
  } catch (error) {
    console.error(
      "DELIVERY_SLOTS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to load delivery slots.",
      },
      500
    );
  }
}