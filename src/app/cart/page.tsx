import { prisma } from "@/lib/prisma";
import CartView from "@/components/cart/cart-view";

type CartProduct = {
  id: string;
  name: string;
  nameTe: string;
  price: number;
  unit: string;
  imageUrl: string | null;
};

export default async function CartPage() {
  const vegetables = await prisma.vegetable.findMany({
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
    },
  });

  const products: CartProduct[] = vegetables.map(
    (vegetable) => ({
      id: vegetable.id,
      name: vegetable.nameEn,
      nameTe: vegetable.nameTe,
      price: Number(vegetable.price),
      unit: vegetable.unit,
      imageUrl: vegetable.imageUrl,
    })
  );

  return <CartView products={products} />;
}