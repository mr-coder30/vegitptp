import crypto from "crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const CUSTOMER_SESSION_COOKIE =
  "vegitptp-customer";

export async function getAuthenticatedCustomer() {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get(
      CUSTOMER_SESSION_COOKIE
    )?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const session =
    await prisma.customerSession.findUnique({
      where: {
        tokenHash,
      },
      include: {
        customer: true,
      },
    });

  if (!session) {
    cookieStore.delete(
      CUSTOMER_SESSION_COOKIE
    );

    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.customerSession.deleteMany({
      where: {
        id: session.id,
      },
    });

    cookieStore.delete(
      CUSTOMER_SESSION_COOKIE
    );

    return null;
  }

  return session.customer;
}