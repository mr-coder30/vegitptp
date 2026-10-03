import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const vegetable = await prisma.vegetable.findUnique({
      where: { id },
    });

    if (!vegetable) {
      return NextResponse.json(
        { error: "Vegetable not found." },
        { status: 404 }
      );
    }

    const data: {
      isAvailable?: boolean;
      price?: number;
      nameTe?: string;
      nameEn?: string;
      imageUrl?: string | null;
    } = {};

    if (typeof body.isAvailable === "boolean") {
      data.isAvailable = body.isAvailable;
    }

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { error: "Enter a valid price." },
          { status: 400 }
        );
      }

      data.price = price;
    }

    if (typeof body.nameTe === "string") {
      const value = body.nameTe.trim();

      if (!value) {
        return NextResponse.json(
          { error: "Telugu name cannot be empty." },
          { status: 400 }
        );
      }

      data.nameTe = value;
    }

    if (typeof body.nameEn === "string") {
      const value = body.nameEn.trim();

      if (!value) {
        return NextResponse.json(
          { error: "English name cannot be empty." },
          { status: 400 }
        );
      }

      data.nameEn = value;
    }

    if (body.imageUrl === null) {
      data.imageUrl = null;
    } else if (typeof body.imageUrl === "string") {
      data.imageUrl = body.imageUrl.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No changes provided." },
        { status: 400 }
      );
    }

    const updated = await prisma.vegetable.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      vegetable: {
        id: updated.id,
        nameTe: updated.nameTe,
        nameEn: updated.nameEn,
        price: updated.price.toString(),
        unit: updated.unit,
        imageUrl: updated.imageUrl,
        isAvailable: updated.isAvailable,
      },
    });
  } catch (error) {
    console.error("ADMIN_VEGETABLE_UPDATE_ERROR:", error);

    return NextResponse.json(
      { error: "Unable to update vegetable." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const vegetable = await prisma.vegetable.findUnique({
      where: { id },
    });

    if (!vegetable) {
      return NextResponse.json(
        { error: "Vegetable not found." },
        { status: 404 }
      );
    }

    await prisma.vegetable.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("ADMIN_VEGETABLE_DELETE_ERROR:", error);

    return NextResponse.json(
      {
        error:
          "This vegetable cannot be deleted because it may be used in an existing order.",
      },
      { status: 409 }
    );
  }
}