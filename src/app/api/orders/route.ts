import { NextResponse } from "next/server";

import {
  createHash,
  randomUUID,
} from "crypto";

import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedCustomer } from "@/lib/customer-auth";

type OrderRequestItem = {
  id: string;
  type: "vegetable";
  quantity: number;
};

type OrderRequest = {
  customer?: {
    name?: unknown;
    address?: unknown;
    landmark?: unknown;
    locality?: unknown;
    notes?: unknown;
  };

  items?: unknown;

  deliverySlotId?: unknown;
};

const MINIMUM_ORDER = new Prisma.Decimal(139);

const DELIVERY_CHARGE =
  new Prisma.Decimal(20);

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      error,
    },
    {
      status,
      headers: noStoreHeaders(),
    }
  );
}

function cleanString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/*
 * --------------------------------------------------
 * Quantity validation
 * --------------------------------------------------
 *
 * Quantity rules:
 *
 * Minimum:
 * 250 g
 *
 * Below 1 kg:
 * 250 g steps
 *
 * From 1 kg:
 * 500 g steps
 *
 * Maximum:
 * 50 kg
 *
 * Valid examples:
 * 0.25
 * 0.50
 * 0.75
 * 1
 * 1.5
 * 2
 * 2.5
 *
 * Invalid examples:
 * 0.10
 * 0.35
 * 1.25
 * 1.75
 */

function isValidQuantity(
  quantity: unknown
): quantity is number {
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity)
  ) {
    return false;
  }

  if (
    quantity < 0.25 ||
    quantity > 50
  ) {
    return false;
  }

  const step =
    quantity < 1
      ? 0.25
      : 0.5;

  const rounded =
    Math.round(quantity / step) * step;

  return (
    Math.abs(
      rounded - quantity
    ) < 0.000001
  );
}

function isValidDeliverySlotId(
  slotId: unknown
): slotId is string {
  return (
    typeof slotId === "string" &&
    slotId.trim().length > 0 &&
    slotId.trim().length <= 100
  );
}

function generateOrderNumber(): string {
  const timestamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase();

  return `VPTP-${timestamp}-${random}`;
}

/*
 * --------------------------------------------------
 * Idempotency
 * --------------------------------------------------
 */

function getIdempotencyKey(
  request: Request
): string | null {
  const key =
    request.headers
      .get("Idempotency-Key")
      ?.trim();

  if (!key) {
    return null;
  }

  if (
    key.length < 16 ||
    key.length > 128
  ) {
    return null;
  }

  if (
    !/^[A-Za-z0-9._:-]+$/.test(key)
  ) {
    return null;
  }

  return key;
}

function createOrderRequestHash(
  input: {
    customer: {
      name: string;
      address: string;
      landmark: string;
      locality: string;
      notes: string;
    };

    items: OrderRequestItem[];

    deliverySlotId: string;
  }
): string {
  const normalizedItems = [
    ...input.items,
  ].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  const canonicalPayload =
    JSON.stringify({
      customer:
        input.customer,

      items:
        normalizedItems,

      deliverySlotId:
        input.deliverySlotId,
    });

  return createHash("sha256")
    .update(canonicalPayload)
    .digest("hex");
}

/*
 * --------------------------------------------------
 * CSRF / Origin protection
 * --------------------------------------------------
 */

function isSameOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const configuredAppUrl =
    process.env.APP_URL;

  if (!configuredAppUrl) {
    console.error(
      "APP_URL is not configured."
    );

    return false;
  }

  try {
    const expectedOrigin =
      new URL(
        configuredAppUrl
      ).origin;

    return (
      origin === expectedOrigin
    );
  } catch {
    console.error(
      "APP_URL is invalid."
    );

    return false;
  }
}

/*
 * --------------------------------------------------
 * Order response helper
 * --------------------------------------------------
 */

function orderResponse(
  order: {
    id: string;
    orderNumber: string;
    subtotal: Prisma.Decimal;
    deliveryCharge: Prisma.Decimal;
    total: Prisma.Decimal;
    paymentMethod: string;
    paymentCollected: boolean;
    status: string;
    deliverySlotId: string;
    deliverySlotLabel: string;
    deliverySlotStartTime: string;
    deliverySlotEndTime: string | null;
  },
  status: number
) {
  return NextResponse.json(
    {
      success: true,

      order: {
        id:
          order.id,

        orderNumber:
          order.orderNumber,

        subtotal:
          order.subtotal.toString(),

        deliveryCharge:
          order.deliveryCharge.toString(),

        total:
          order.total.toString(),

        paymentMethod:
          order.paymentMethod,

        paymentCollected:
          order.paymentCollected,

        status:
          order.status,

        deliverySlot: {
          id:
            order.deliverySlotId,

          label:
            order.deliverySlotLabel,

          startTime:
            order.deliverySlotStartTime,

          endTime:
            order.deliverySlotEndTime,
        },
      },
    },
    {
      status,

      headers:
        noStoreHeaders(),
    }
  );
}

/*
 * --------------------------------------------------
 * Existing idempotent order lookup
 * --------------------------------------------------
 */

async function findExistingIdempotentOrder(
  idempotencyKey: string,
  idempotencyHash: string,
  customerId: string
) {
  const existingOrder =
    await prisma.order.findUnique({
      where: {
        idempotencyKey,
      },

      select: {
        id: true,

        customerId: true,

        orderNumber: true,

        idempotencyHash: true,

        subtotal: true,

        deliveryCharge: true,

        total: true,

        paymentMethod: true,

        paymentCollected: true,

        status: true,

        deliverySlotId: true,

        deliverySlotLabel: true,

        deliverySlotStartTime: true,

        deliverySlotEndTime: true,
      },
    });

  if (!existingOrder) {
    return null;
  }

  /*
   * Never allow another customer to use
   * an existing customer's idempotency key.
   */

  if (
    existingOrder.customerId !==
    customerId
  ) {
    return {
      conflict: true,
    } as const;
  }

  /*
   * Same key but different payload.
   */

  if (
    existingOrder.idempotencyHash !==
    idempotencyHash
  ) {
    return {
      conflict: true,
    } as const;
  }

  return {
    conflict: false,

    order: existingOrder,
  } as const;
}

export async function POST(
  request: Request
) {
  try {
    /*
     * --------------------------------------------------
     * 1. CSRF / Origin protection
     * --------------------------------------------------
     */

    if (!isSameOrigin(request)) {
      return jsonError(
        "Invalid request origin.",
        403
      );
    }

    /*
     * --------------------------------------------------
     * 2. Idempotency key
     * --------------------------------------------------
     */

    const idempotencyKey =
      getIdempotencyKey(request);

    if (!idempotencyKey) {
      return jsonError(
        "Invalid or missing idempotency key.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 3. Authenticate customer
     * --------------------------------------------------
     */

    const authenticatedCustomer =
      await getAuthenticatedCustomer();

    if (!authenticatedCustomer) {
      return jsonError(
        "Please login before placing an order.",
        401
      );
    }

    /*
     * --------------------------------------------------
     * 4. Parse request safely
     * --------------------------------------------------
     */

    let body: OrderRequest;

    try {
      const parsed =
        await request.json();

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return jsonError(
          "Invalid request.",
          400
        );
      }

      body =
        parsed as OrderRequest;
    } catch {
      return jsonError(
        "Invalid request.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 5. Validate customer delivery information
     * --------------------------------------------------
     */

    const name = cleanString(
      body.customer?.name
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

    if (
      !name ||
      name.length > 100
    ) {
      return jsonError(
        "Please enter a valid name.",
        400
      );
    }

    if (
      !address ||
      address.length > 500
    ) {
      return jsonError(
        "Please enter a valid delivery address.",
        400
      );
    }

    if (
      landmark.length > 200
    ) {
      return jsonError(
        "Landmark is too long.",
        400
      );
    }

    if (
      locality.length > 100
    ) {
      return jsonError(
        "Locality is too long.",
        400
      );
    }

    if (
      notes.length > 500
    ) {
      return jsonError(
        "Delivery note is too long.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 6. Validate delivery slot ID
     * --------------------------------------------------
     */

    if (
      !isValidDeliverySlotId(
        body.deliverySlotId
      )
    ) {
      return jsonError(
        "Please select a valid delivery slot.",
        400
      );
    }

    const deliverySlotId =
      body.deliverySlotId.trim();

    /*
     * --------------------------------------------------
     * 7. Validate basket exists
     * --------------------------------------------------
     */

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return jsonError(
        "Your basket is empty.",
        400
      );
    }

    if (
      body.items.length > 50
    ) {
      return jsonError(
        "Too many items in basket.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 8. Validate and normalize cart items
     * --------------------------------------------------
     */

    let items: OrderRequestItem[];

    try {
      items = body.items.map(
        (rawItem) => {
          if (
            !rawItem ||
            typeof rawItem !== "object" ||
            Array.isArray(rawItem)
          ) {
            throw new Error(
              "Invalid basket item."
            );
          }

          const item =
            rawItem as Record<
              string,
              unknown
            >;

          return {
            id: cleanString(
              item.id
            ),

            type: "vegetable",

            quantity:
              item.quantity as number,
          };
        }
      );
    } catch {
      return jsonError(
        "Invalid basket item.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 9. Validate every item
     * --------------------------------------------------
     */

    for (const item of items) {
      if (!item.id) {
        return jsonError(
          "Invalid vegetable.",
          400
        );
      }

      if (
        !isValidQuantity(
          item.quantity
        )
      ) {
        return jsonError(
          "Invalid quantity. Use 250 g steps below 1 kg and 500 g steps from 1 kg.",
          400
        );
      }
    }

    /*
     * --------------------------------------------------
     * 10. Prevent duplicate vegetables
     * --------------------------------------------------
     */

    const uniqueItems =
      new Set(
        items.map(
          (item) => item.id
        )
      );

    if (
      uniqueItems.size !==
      items.length
    ) {
      return jsonError(
        "Duplicate vegetables are not allowed.",
        400
      );
    }

    /*
     * --------------------------------------------------
     * 11. Create request fingerprint
     * --------------------------------------------------
     */

    const idempotencyHash =
      createOrderRequestHash({
        customer: {
          name,
          address,
          landmark,
          locality,
          notes,
        },

        items,

        deliverySlotId,
      });

    /*
     * --------------------------------------------------
     * 12. Check for an existing order
     * --------------------------------------------------
     */

    const existing =
      await findExistingIdempotentOrder(
        idempotencyKey,
        idempotencyHash,
        authenticatedCustomer.id
      );

    if (existing?.conflict) {
      return jsonError(
        "Invalid idempotency key.",
        409
      );
    }

    if (
      existing?.order
    ) {
      return orderResponse(
        existing.order,
        200
      );
    }

    /*
     * --------------------------------------------------
     * 13. Create order transaction
     * --------------------------------------------------
     */

    let result;

    try {
      result =
        await prisma.$transaction(
          async (tx) => {
            /*
             * ----------------------------------------------
             * 13A. Re-fetch authenticated customer
             * ----------------------------------------------
             */

            const customer =
              await tx.customer.findUnique({
                where: {
                  id:
                    authenticatedCustomer.id,
                },
              });

            if (!customer) {
              throw new Error(
                "Authenticated customer no longer exists."
              );
            }

            /*
             * ----------------------------------------------
             * 13B. Load current store settings
             * ----------------------------------------------
             */

            let storeSettings =
              await tx.storeSettings.findUnique(
                {
                  where: {
                    id: "default",
                  },
                }
              );

            if (!storeSettings) {
              storeSettings =
                await tx.storeSettings.create(
                  {
                    data: {
                      id: "default",

                      minimumOrder:
                        MINIMUM_ORDER,

                      deliveryCharge:
                        DELIVERY_CHARGE,
                    },
                  }
                );
            }

            const minimumOrder =
              new Prisma.Decimal(
                storeSettings.minimumOrder
              );

            const deliveryChargeAmount =
              new Prisma.Decimal(
                storeSettings.deliveryCharge
              );

            /*
             * ----------------------------------------------
             * 13C. Load CURRENT active delivery slot
             * ----------------------------------------------
             */

            const deliverySlot =
              await tx.deliverySlot.findFirst(
                {
                  where: {
                    id:
                      deliverySlotId,

                    isActive:
                      true,
                  },

                  select: {
                    id: true,

                    label: true,

                    startTime: true,

                    endTime: true,
                  },
                }
              );

            if (!deliverySlot) {
              throw new Error(
                "DELIVERY_SLOT_UNAVAILABLE"
              );
            }

            /*
             * ----------------------------------------------
             * 13D. Load CURRENT available vegetables
             * ----------------------------------------------
             */

            const vegetableIds =
              items.map(
                (item) => item.id
              );

            const vegetables =
              await tx.vegetable.findMany(
                {
                  where: {
                    id: {
                      in: vegetableIds,
                    },

                    isAvailable:
                      true,
                  },
                }
              );

            if (
              vegetables.length !==
              vegetableIds.length
            ) {
              throw new Error(
                "VEGETABLE_UNAVAILABLE"
              );
            }

            /*
             * ----------------------------------------------
             * 13E. Calculate subtotal SERVER-SIDE
             * ----------------------------------------------
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

            for (
              const item of items
            ) {
              const vegetable =
                vegetables.find(
                  (product) =>
                    product.id ===
                    item.id
                );

              if (!vegetable) {
                throw new Error(
                  "VEGETABLE_UNAVAILABLE"
                );
              }

              const quantity =
                new Prisma.Decimal(
                  item.quantity.toString()
                );

              const itemTotal =
                vegetable.price.mul(
                  quantity
                );

              subtotal =
                subtotal.add(
                  itemTotal
                );

              orderItems.push({
                vegetableId:
                  vegetable.id,

                name:
                  vegetable.nameEn,

                quantity,

                unitPrice:
                  vegetable.price,

                total:
                  itemTotal,
              });
            }

            /*
             * ----------------------------------------------
             * 13F. Minimum order validation
             * ----------------------------------------------
             */

            if (
              subtotal.lessThan(
                minimumOrder
              )
            ) {
              throw new Error(
                "MINIMUM_ORDER_NOT_MET"
              );
            }

            /*
             * ----------------------------------------------
             * 13G. Calculate delivery charge
             * ----------------------------------------------
             *
             * Delivery is ALWAYS charged.
             * There is NO free-delivery threshold.
             */

            const deliveryCharge =
              deliveryChargeAmount;

            const total =
              subtotal.add(
                deliveryCharge
              );

            /*
             * ----------------------------------------------
             * 13H. Update customer delivery information
             * ----------------------------------------------
             */

            const updatedCustomer =
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

            /*
             * ----------------------------------------------
             * 13I. Generate order number
             * ----------------------------------------------
             */

            const orderNumber =
              generateOrderNumber();

            /*
             * ----------------------------------------------
             * 13J. Create order
             * ----------------------------------------------
             */

            const order =
              await tx.order.create({
                data: {
                  orderNumber,

                  /*
                   * Idempotency information.
                   *
                   * The database UNIQUE constraint on
                   * idempotencyKey is the final protection
                   * against concurrent duplicate requests.
                   */

                  idempotencyKey,

                  idempotencyHash,

                  customerId:
                    updatedCustomer.id,

                  customerName:
                    updatedCustomer.name,

                  phone:
                    updatedCustomer.phone,

                  address:
                    updatedCustomer.address,

                  landmark:
                    updatedCustomer.landmark,

                  locality:
                    updatedCustomer.locality,

                  notes:
                    notes || null,

                  deliverySlotId:
                    deliverySlot.id,

                  deliverySlotLabel:
                    deliverySlot.label,

                  deliverySlotStartTime:
                    deliverySlot.startTime,

                  deliverySlotEndTime:
                    deliverySlot.endTime,

                  subtotal,

                  deliveryCharge,

                  total,

                  paymentMethod:
                    "CASH",

                  paymentAccountId:
                    null,

                  paymentAccountName:
                    null,

                  paymentCollected:
                    false,

                  paymentCollectedAt:
                    null,

                  status:
                    "PENDING",

                  items: {
                    create:
                      orderItems,
                  },
                },
              });

            return order;
          }
        );
    } catch (error) {
      /*
       * --------------------------------------------------
       * 13K. Idempotency race-condition handling
       * --------------------------------------------------
       *
       * If two identical requests arrive at exactly
       * the same time, both may initially see no order.
       *
       * The database UNIQUE constraint allows only one
       * request to insert the idempotency key.
       *
       * The losing request gets Prisma P2002.
       *
       * We then fetch the winning order and return it.
       */

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingAfterRace =
          await findExistingIdempotentOrder(
            idempotencyKey,
            idempotencyHash,
            authenticatedCustomer.id
          );

        if (
          existingAfterRace?.conflict
        ) {
          return jsonError(
            "Invalid idempotency key.",
            409
          );
        }

        if (
          existingAfterRace?.order
        ) {
          return orderResponse(
            existingAfterRace.order,
            200
          );
        }
      }

      throw error;
    }

    /*
     * --------------------------------------------------
     * 14. Successful response
     * --------------------------------------------------
     */

    return orderResponse(
      result,
      201
    );
  } catch (error) {
    /*
     * --------------------------------------------------
     * 15. Expected business errors
     * --------------------------------------------------
     */

    if (
      error instanceof Error
    ) {
      if (
        error.message ===
        "DELIVERY_SLOT_UNAVAILABLE"
      ) {
        return jsonError(
          "That delivery slot is no longer available. Please choose another slot.",
          400
        );
      }

      if (
        error.message ===
        "VEGETABLE_UNAVAILABLE"
      ) {
        return jsonError(
          "One or more vegetables are no longer available.",
          400
        );
      }

      if (
        error.message ===
        "MINIMUM_ORDER_NOT_MET"
      ) {
        return jsonError(
          "Your basket does not meet the minimum order value.",
          400
        );
      }

      if (
        error.message ===
        "Authenticated customer no longer exists."
      ) {
        return jsonError(
          "Your session is no longer valid. Please login again.",
          401
        );
      }
    }

    /*
     * --------------------------------------------------
     * 16. Unexpected errors
     * --------------------------------------------------
     */

    console.error(
      "ORDER_CREATION_ERROR:",
      error
    );

    return jsonError(
      "Something went wrong while placing your order.",
      500
    );
  }
}