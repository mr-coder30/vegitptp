import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireDeliveryBoy } from "@/lib/delivery-auth";

export async function GET() {
  try {
    const authenticated = await requireDeliveryBoy();

    if (!authenticated) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const accounts =
      await prisma.paymentAccount.findMany({
        where: {
          isActive: true,
          qrImageUrl: {
            not: null,
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          name: true,
          qrImageUrl: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        accounts,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "DELIVERY_PAYMENT_ACCOUNTS_GET_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load QR payment accounts.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}