import { cookies } from "next/headers";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("vegitptp-admin")?.value;

  return adminCookie === "authenticated";
}