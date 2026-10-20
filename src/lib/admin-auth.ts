import { cookies } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const ADMIN_COOKIE = "vegitptp-admin";

function hashToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function requireAdmin() {
  const cookieStore = await cookies();

  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  if (!token) {
    return false;
  }

  const tokenHash = hashToken(token);

  const session = await prisma.adminSession.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      expiresAt: true,
      admin: {
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

  if (!session.admin.isActive) {
    return false;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.adminSession.delete({
      where: {
        id: session.id,
      },
    });

    return false;
  }

  return true;
}