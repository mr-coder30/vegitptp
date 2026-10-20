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
    const vegetables =
      await prisma.vegetable.findMany({
        where: {
          isAvailable: true,
        },
        select: {
          id: true,
          nameTe: true,
          nameEn: true,
          price: true,
          unit: true,
          imageUrl: true,
          isAvailable: true,
        },
        orderBy: {
          nameEn: "asc",
        },
      });

    return jsonResponse({
      success: true,
      vegetables: vegetables.map(
        (vegetable) => ({
          id: vegetable.id,
          nameTe: vegetable.nameTe,
          nameEn: vegetable.nameEn,
          price: vegetable.price.toString(),
          unit: vegetable.unit,
          imageUrl: vegetable.imageUrl,
          isAvailable:
            vegetable.isAvailable,
        })
      ),
    });
  } catch (error) {
    console.error(
      "VEGETABLES_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to load vegetables.",
      },
      500
    );
  }
}