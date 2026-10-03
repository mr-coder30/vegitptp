import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const vegetables = await prisma.vegetable.findMany({
      orderBy: {
        nameEn: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      vegetables: vegetables.map((vegetable) => ({
        id: vegetable.id,
        nameTe: vegetable.nameTe,
        nameEn: vegetable.nameEn,
        price: vegetable.price.toString(),
        unit: vegetable.unit,
        imageUrl: vegetable.imageUrl,
        isAvailable: vegetable.isAvailable,
      })),
    });
  } catch (error) {
    console.error("ADMIN_VEGETABLES_GET_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load vegetables." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nameTe =
      typeof body?.nameTe === "string" ? body.nameTe.trim() : "";

    const nameEn =
      typeof body?.nameEn === "string" ? body.nameEn.trim() : "";

    const price = Number(body?.price);

    const unit =
      typeof body?.unit === "string" && body.unit.trim()
        ? body.unit.trim()
        : "kg";

    const imageUrl =
      typeof body?.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    if (!nameTe || !nameEn) {
      return NextResponse.json(
        { error: "Telugu and English names are required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Enter a valid price." },
        { status: 400 }
      );
    }

    const vegetable = await prisma.vegetable.create({
      data: {
        nameTe,
        nameEn,
        price,
        unit,
        imageUrl,
        isAvailable: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        vegetable: {
          id: vegetable.id,
          nameTe: vegetable.nameTe,
          nameEn: vegetable.nameEn,
          price: vegetable.price.toString(),
          unit: vegetable.unit,
          imageUrl: vegetable.imageUrl,
          isAvailable: vegetable.isAvailable,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ADMIN_VEGETABLES_POST_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to add vegetable." },
      { status: 500 }
    );
  }
}