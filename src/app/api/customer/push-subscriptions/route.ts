import { NextResponse } from "next/server";

import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import { isSameOrigin } from "@/lib/csrf";
import { getWebPushPublicKey } from "@/lib/web-push";
import { prisma } from "@/lib/prisma";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isPushServiceHost(hostname: string) {
  return (
    hostname === "fcm.googleapis.com" ||
    hostname === "push.services.mozilla.com" ||
    hostname.endsWith(".push.services.mozilla.com") ||
    hostname === "web.push.apple.com"
  );
}

export async function GET() {
  const publicKey = getWebPushPublicKey();
  if (!publicKey) {
    return response(
      { error: "Push notifications are not configured." },
      503
    );
  }

  const customer = await getAuthenticatedCustomer();

  if (!customer) {
    return response({ error: "Please log in." }, 401);
  }

  return response({ publicKey });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return response({ error: "Please log in." }, 401);
  }

  if (!getWebPushPublicKey()) {
    return response(
      { error: "Push notifications are not configured." },
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: "Invalid subscription." }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return response({ error: "Invalid subscription." }, 400);
  }

  const subscription = body as Record<string, unknown>;
  const keys =
    typeof subscription.keys === "object" && subscription.keys !== null
      ? (subscription.keys as Record<string, unknown>)
      : null;
  const endpoint =
    typeof subscription.endpoint === "string"
      ? subscription.endpoint
      : "";
  const p256dh =
    typeof keys?.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys?.auth === "string" ? keys.auth : "";
  const language =
    subscription.language === "te" ? "te" : "en";

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return response({ error: "Invalid subscription endpoint." }, 400);
  }

  if (
    endpointUrl.protocol !== "https:" ||
    !isPushServiceHost(endpointUrl.hostname) ||
    endpoint.length > 2048 ||
    !p256dh ||
    p256dh.length > 256 ||
    !auth ||
    auth.length > 256
  ) {
    return response({ error: "Invalid subscription." }, 400);
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        customerId: customer.id,
        endpoint,
        p256dh,
        auth,
        language,
      },
      update: {
        customerId: customer.id,
        p256dh,
        auth,
        language,
      },
    });
  } catch (error) {
    console.error("PUSH_SUBSCRIPTION_SAVE_ERROR:", error);
    return response({ error: "Unable to save subscription." }, 500);
  }

  return response({ success: true }, 201);
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return response({ error: "Please log in." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: "Invalid subscription." }, 400);
  }

  const endpoint =
    typeof body === "object" &&
    body !== null &&
    "endpoint" in body &&
    typeof body.endpoint === "string"
      ? body.endpoint
      : "";

  if (!endpoint || endpoint.length > 2048) {
    return response({ error: "Invalid subscription endpoint." }, 400);
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        customerId: customer.id,
      },
    });
  } catch (error) {
    console.error("PUSH_SUBSCRIPTION_DELETE_ERROR:", error);
    return response({ error: "Unable to remove subscription." }, 500);
  }

  return response({ success: true });
}
