import { createHash } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const DELIVERY_COOKIE = "vegitptp-delivery";

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function requireDeliveryBoy() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(DELIVERY_COOKIE)?.value;

  if (!token) {
    return false;
  }

  const tokenHash = hashToken(token);

  const session =
    await prisma.deliverySession.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        expiresAt: true,

        deliveryBoy: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

  if (!session) {
    return false;
  }

  /*
   * Reject expired sessions.
   */
  if (session.expiresAt <= new Date()) {
    await prisma.deliverySession.deleteMany({
      where: {
        id: session.id,
      },
    });

    return false;
  }

  /*
   * Reject sessions belonging to a disabled
   * delivery account.
   */
  if (!session.deliveryBoy.isActive) {
    await prisma.deliverySession.deleteMany({
      where: {
        id: session.id,
      },
    });

    return false;
  }

  return true;
}