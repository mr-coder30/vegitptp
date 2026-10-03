import { prisma } from "@/lib/prisma";
import VegetableCard from "@/components/customer/vegetable-card";

export default async function HomePage() {
  const vegetables = await prisma.vegetable.findMany({
    where: {
      isAvailable: true,
    },
    orderBy: {
      nameEn: "asc",
    },
  });

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Fresh vegetables
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Fresh vegetables delivered in Pithapuram.
        </p>
      </div>

      {/* Vegetables */}
      {vegetables.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-white p-6 text-center shadow-sm">
          <p className="font-semibold">
            No vegetables available right now.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Please check again later.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {vegetables.map((vegetable) => (
            <VegetableCard
              key={vegetable.id}
              vegetable={{
                id: vegetable.id,
                nameTe: vegetable.nameTe,
                nameEn: vegetable.nameEn,
                price: vegetable.price.toString(),
                unit: vegetable.unit,
                imageUrl: vegetable.imageUrl,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}