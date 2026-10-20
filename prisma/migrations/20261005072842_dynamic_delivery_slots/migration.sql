/*
  Dynamic delivery slots

  Existing orders have intentionally been deleted.
  This migration replaces the old DeliverySlot enum
  with a dynamic DeliverySlot table.
*/

-- Remove the old Order index
DROP INDEX IF EXISTS "Order_deliverySlot_idx";

-- Rename the old enum temporarily so the new table can use
-- the name "DeliverySlot".
ALTER TYPE "DeliverySlot" RENAME TO "DeliverySlotLegacy";

-- Remove the old deliverySlot column from Order
ALTER TABLE "Order"
DROP COLUMN "deliverySlot";

-- Remove old hardcoded delivery-slot settings
ALTER TABLE "StoreSettings"
DROP COLUMN "evening1800Active",
DROP COLUMN "evening2000Active",
DROP COLUMN "morning0630Active",
DROP COLUMN "morning0800Active",
DROP COLUMN "morning1000Active";

-- Create the new dynamic delivery-slot table
CREATE TABLE "DeliverySlot" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySlot_pkey" PRIMARY KEY ("id")
);

-- Indexes for delivery-slot administration/querying
CREATE INDEX "DeliverySlot_isActive_idx"
ON "DeliverySlot"("isActive");

CREATE INDEX "DeliverySlot_sortOrder_idx"
ON "DeliverySlot"("sortOrder");

-- Add the new delivery-slot fields to Order
ALTER TABLE "Order"
ADD COLUMN "deliverySlotId" TEXT NOT NULL,
ADD COLUMN "deliverySlotLabel" TEXT NOT NULL,
ADD COLUMN "deliverySlotStartTime" TEXT NOT NULL,
ADD COLUMN "deliverySlotEndTime" TEXT;

-- Index for Order -> DeliverySlot
CREATE INDEX "Order_deliverySlotId_idx"
ON "Order"("deliverySlotId");

-- Create the initial delivery slots
INSERT INTO "DeliverySlot" (
    "id",
    "label",
    "startTime",
    "endTime",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
VALUES
(
    'slot_morning_0630',
    '6:30 AM',
    '06:30',
    NULL,
    true,
    10,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'slot_morning_0800',
    '8:00 AM',
    '08:00',
    NULL,
    true,
    20,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'slot_morning_1000',
    '10:00 AM',
    '10:00',
    NULL,
    true,
    30,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'slot_evening_1800',
    '6:00 PM',
    '18:00',
    NULL,
    true,
    40,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'slot_evening_2000',
    '8:00 PM',
    '20:00',
    NULL,
    true,
    50,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Remove the old enum now that the old Order column is gone
DROP TYPE "DeliverySlotLegacy";

-- Create the new Order -> DeliverySlot relationship
ALTER TABLE "Order"
ADD CONSTRAINT "Order_deliverySlotId_fkey"
FOREIGN KEY ("deliverySlotId")
REFERENCES "DeliverySlot"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;