import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Development reset
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.vegetable.deleteMany();
  await prisma.customer.deleteMany();

  // Vegetables
  await prisma.vegetable.createMany({
    data: [
      {
        nameTe: "టమాటా",
        nameEn: "Tomato",
        price: 30,
        unit: "kg",
        imageUrl: "/vegetables/tomato.webp",
      },
      {
        nameTe: "బంగాళాదుంప",
        nameEn: "Potato",
        price: 35,
        unit: "kg",
        imageUrl: "/vegetables/potato.webp",
      },
      {
        nameTe: "ఉల్లిపాయ",
        nameEn: "Onion",
        price: 40,
        unit: "kg",
        imageUrl: "/vegetables/onion.webp",
      },
      {
        nameTe: "వంకాయ",
        nameEn: "Brinjal",
        price: 45,
        unit: "kg",
        imageUrl: "/vegetables/brinjal.webp",
      },
      {
        nameTe: "క్యారెట్",
        nameEn: "Carrot",
        price: 50,
        unit: "kg",
        imageUrl: "/vegetables/carrot.webp",
      },
      {
        nameTe: "బీన్స్",
        nameEn: "Beans",
        price: 50,
        unit: "kg",
        imageUrl: "/vegetables/beans.webp",
      },
      {
        nameTe: "కాలీఫ్లవర్",
        nameEn: "Cauliflower",
        price: 45,
        unit: "piece",
        imageUrl: "/vegetables/cauliflower.webp",
      },
      {
        nameTe: "క్యాప్సికమ్",
        nameEn: "Capsicum",
        price: 60,
        unit: "kg",
        imageUrl: "/vegetables/capsicum.webp",
      },
    ],
  });

  console.log("VegItPTP development seed completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });