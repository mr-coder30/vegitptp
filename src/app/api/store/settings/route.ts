import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  minimumOrder: 139,
  deliveryCharge: 20,
};

async function getOrCreateSettings() {
  let settings = await prisma.storeSettings.findUnique({
    where: {
      id: "default",
    },
  });

  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: {
        id: "default",
        ...DEFAULT_SETTINGS,
      },
    });
  }

  return settings;
}

export async function GET() {
  try {
    const [settings, deliverySlots] = await Promise.all([
      getOrCreateSettings(),

      prisma.deliverySlot.findMany({
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
      }),
    ]);

    return NextResponse.json({
      minimumOrder: Number(settings.minimumOrder),
      deliveryCharge: Number(settings.deliveryCharge),
      deliverySlots,
    });
  } catch (error) {
    console.error("STORE_SETTINGS_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to load store settings.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}