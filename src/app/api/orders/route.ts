import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type OrderRequestItem = {
  id: string;
  type: "vegetable";
  quantity: number;
};

type OrderRequest = {
  customer?: {
    name?: unknown;
    phone?: unknown;
    address?: unknown;
    landmark?: unknown;
    locality?: unknown;
    notes?: unknown;
  };

  items?: unknown;

  deliverySlot?: unknown;
};

const MINIMUM_ORDER = new Prisma.Decimal(109);
const FREE_DELIVERY_THRESHOLD = new Prisma.Decimal(149);
const DELIVERY_CHARGE = new Prisma.Decimal(20);

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function isValidQuantity(
  quantity: unknown
): quantity is number {
  return (
    typeof quantity === "number" &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    quantity <= 50
  );
}

type DeliverySlot =
  | "MORNING_0630"
  | "MORNING_0800"
  | "MORNING_1000"
  | "EVENING_1800"
  | "EVENING_2000";

function isValidDeliverySlot(
  slot: unknown
): slot is DeliverySlot {
  return (
    slot === "MORNING_0630" ||
    slot === "MORNING_0800" ||
    slot === "MORNING_1000" ||
    slot === "EVENING_1800" ||
    slot === "EVENING_2000"
  );
}

function generateOrderNumber(): string {
  const timestamp =
    Date.now().toString(36).toUpperCase();

  const random =
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase();

  return `VPTP-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    /*
     * --------------------------------------------------
     * 1. Parse request
     * --------------------------------------------------
     */

    let body: OrderRequest;

    try {
      body = (await request.json()) as OrderRequest;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 2. Validate customer information
     * --------------------------------------------------
     */

    const name = cleanString(
      body.customer?.name
    );

    const phone = cleanString(
      body.customer?.phone
    );

    const address = cleanString(
      body.customer?.address
    );

    const landmark = cleanString(
      body.customer?.landmark
    );

    const locality = cleanString(
      body.customer?.locality
    );

    const notes = cleanString(
      body.customer?.notes
    );

    if (!name || name.length > 100) {
      return NextResponse.json(
        {
          error: "Please enter a valid name.",
        },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid 10-digit mobile number.",
        },
        { status: 400 }
      );
    }

    if (!address || address.length > 500) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid delivery address.",
        },
        { status: 400 }
      );
    }

    if (landmark.length > 200) {
      return NextResponse.json(
        {
          error: "Landmark is too long.",
        },
        { status: 400 }
      );
    }

    if (locality.length > 100) {
      return NextResponse.json(
        {
          error: "Locality is too long.",
        },
        { status: 400 }
      );
    }

    if (notes.length > 500) {
      return NextResponse.json(
        {
          error: "Delivery note is too long.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 3. Validate delivery slot
     * --------------------------------------------------
     */

    if (!isValidDeliverySlot(body.deliverySlot)) {
      return NextResponse.json(
        {
          error:
            "Please select a valid delivery slot.",
        },
        { status: 400 }
      );
    }

    const deliverySlot = body.deliverySlot;

    /*
     * --------------------------------------------------
     * 4. Validate cart
     * --------------------------------------------------
     */

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Your basket is empty.",
        },
        { status: 400 }
      );
    }

    if (body.items.length > 50) {
      return NextResponse.json(
        {
          error: "Too many items in basket.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 5. Validate and normalize cart items
     * --------------------------------------------------
     */

    const items: OrderRequestItem[] =
      body.items.map((rawItem) => {
        if (
          !rawItem ||
          typeof rawItem !== "object"
        ) {
          throw new Error(
            "Invalid basket item."
          );
        }

        const item =
          rawItem as Record<string, unknown>;

        return {
          id: cleanString(item.id),
          type: "vegetable",
          quantity: item.quantity as number,
        };
      });

    /*
     * --------------------------------------------------
     * 6. Validate each item
     * --------------------------------------------------
     */

    for (const item of items) {
      if (!item.id) {
        return NextResponse.json(
          {
            error: "Invalid vegetable.",
          },
          { status: 400 }
        );
      }

      if (!isValidQuantity(item.quantity)) {
        return NextResponse.json(
          {
            error: "Invalid quantity.",
          },
          { status: 400 }
        );
      }

      /*
       * Vegetables use 500 g increments.
       */

      if (item.quantity % 0.5 !== 0) {
        return NextResponse.json(
          {
            error:
              "Vegetable quantity must use 500 g steps.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * --------------------------------------------------
     * 7. Prevent duplicate vegetables
     * --------------------------------------------------
     */

    const uniqueItems = new Set(
      items.map((item) => item.id)
    );

    if (
      uniqueItems.size !== items.length
    ) {
      return NextResponse.json(
        {
          error:
            "Duplicate vegetables are not allowed.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 8. Fetch current vegetables
     * --------------------------------------------------
     *
     * Never trust names/prices from the browser.
     */

    const vegetableIds = items.map(
      (item) => item.id
    );

    const vegetables =
      await prisma.vegetable.findMany({
        where: {
          id: {
            in: vegetableIds,
          },
          isAvailable: true,
        },
      });

    /*
     * Make sure every requested vegetable exists
     * and is currently available.
     */

    if (
      vegetables.length !==
      vegetableIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more vegetables are no longer available.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 9. Calculate subtotal SERVER-SIDE
     * --------------------------------------------------
     */

    const orderItems: {
      vegetableId: string;
      name: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      total: Prisma.Decimal;
    }[] = [];

    let subtotal =
      new Prisma.Decimal(0);

    for (const item of items) {
      const vegetable =
        vegetables.find(
          (product) =>
            product.id === item.id
        );

      if (!vegetable) {
        return NextResponse.json(
          {
            error:
              "A vegetable is no longer available.",
          },
          { status: 400 }
        );
      }

      const quantity =
        new Prisma.Decimal(
          item.quantity
        );

      const itemTotal =
        vegetable.price.mul(quantity);

      subtotal =
        subtotal.add(itemTotal);

      /*
       * IMPORTANT:
       *
       * OrderItem only contains:
       * vegetableId
       * name
       * quantity
       * unitPrice
       * total
       *
       * No productId.
       * No productType.
       * No basketId.
       */

      orderItems.push({
        vegetableId: vegetable.id,
        name: vegetable.nameEn,
        quantity,
        unitPrice: vegetable.price,
        total: itemTotal,
      });
    }

    /*
     * --------------------------------------------------
     * 10. Minimum order validation
     * --------------------------------------------------
     */

    if (
      subtotal.lessThan(
        MINIMUM_ORDER
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum order value is ₹109.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * 11. Calculate delivery charge
     * --------------------------------------------------
     *
     * ₹109 - ₹148.99 → ₹20
     * ₹149+          → FREE
     */

    const deliveryCharge =
      subtotal.greaterThanOrEqualTo(
        FREE_DELIVERY_THRESHOLD
      )
        ? new Prisma.Decimal(0)
        : DELIVERY_CHARGE;

    const total =
      subtotal.add(deliveryCharge);

    /*
     * --------------------------------------------------
     * 12. Create customer + order
     * --------------------------------------------------
     */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Find existing customer by phone.
           */

          let customer =
            await tx.customer.findFirst({
              where: {
                phone,
              },
            });

          /*
           * Update existing customer.
           */

          if (customer) {
            customer =
              await tx.customer.update({
                where: {
                  id: customer.id,
                },

                data: {
                  name,
                  address,
                  landmark:
                    landmark || null,
                  locality:
                    locality || null,
                },
              });
          }

          /*
           * Create new customer.
           */

          else {
            customer =
              await tx.customer.create({
                data: {
                  name,
                  phone,
                  address,
                  landmark:
                    landmark || null,
                  locality:
                    locality || null,
                },
              });
          }

          /*
           * Generate unique order number.
           */

          const orderNumber =
            generateOrderNumber();

          /*
           * Create order.
           */

          const order = await tx.order.create({
            data: {
              orderNumber,

              customerId: customer.id,

              customerName: name,
              phone,
              address,

              landmark: landmark || null,
              locality: locality || null,
              notes: notes || null,

              deliverySlot,

              subtotal,
              deliveryCharge,
              total,

              paymentMethod: "CASH_ON_DELIVERY",
              status: "PENDING",

              items: {
                create: orderItems,
              },
            },
          });

          return order;
        }
      );

    /*
     * --------------------------------------------------
     * 13. Successful response
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        order: {
          id: result.id,

          orderNumber:
            result.orderNumber,

          subtotal:
            result.subtotal.toString(),

          deliveryCharge:
            result.deliveryCharge.toString(),

          total:
            result.total.toString(),

          paymentMethod:
            result.paymentMethod,

          status:
            result.status,

          deliverySlot:
            result.deliverySlot,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    /*
     * --------------------------------------------------
     * DEBUG ERROR
     * --------------------------------------------------
     */

    console.error(
      "================================="
    );

    console.error(
      "ORDER_CREATION_ERROR"
    );

    console.error(error);

    if (error instanceof Error) {
      console.error(
        "ERROR MESSAGE:",
        error.message
      );

      console.error(
        "ERROR STACK:",
        error.stack
      );
    }

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      console.error(
        "PRISMA CODE:",
        error.code
      );

      console.error(
        "PRISMA META:",
        error.meta
      );
    }

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while placing your order.",
      },
      {
        status: 500,
      }
    );
  }
}