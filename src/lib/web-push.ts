import webPush, { type PushSubscription as WebPushSubscription } from "web-push";

import { prisma } from "@/lib/prisma";
import { formatTranslation, translations } from "@/lib/translation-dictionary";
import type { Language } from "@/components/language/language-provider";

type OrderPushStatus =
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

const statusCopy: Record<
  OrderPushStatus,
  {
    title: keyof typeof translations.en.notifications;
    body: keyof typeof translations.en.notifications;
  }
> = {
  CONFIRMED: {
    title: "confirmedTitle",
    body: "confirmedBody",
  },
  OUT_FOR_DELIVERY: {
    title: "outForDeliveryTitle",
    body: "outForDeliveryBody",
  },
  DELIVERED: {
    title: "deliveredTitle",
    body: "deliveredBody",
  },
};

export function getWebPushPublicKey() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;

  return publicKey && privateKey && subject ? publicKey : null;
}

function configureWebPush() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Web Push is not configured. Set WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, and WEB_PUSH_VAPID_SUBJECT."
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendOrderStatusNotification(
  orderId: string,
  status: OrderPushStatus
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        customerId: true,
        customer: {
          select: {
            pushSubscriptions: {
              select: {
                id: true,
                endpoint: true,
                p256dh: true,
                auth: true,
                language: true,
              },
            },
          },
        },
      },
    });

    if (!order || order.customer.pushSubscriptions.length === 0) {
      return;
    }

    configureWebPush();

    const messageKeys = statusCopy[status];

    await Promise.all(
      order.customer.pushSubscriptions.map(async (subscription) => {
        const language: Language =
          subscription.language === "te" ? "te" : "en";
        const copy = translations[language].notifications;
        const payload = JSON.stringify({
          title: copy[messageKeys.title],
          body: formatTranslation(copy[messageKeys.body], {
            orderNumber: order.orderNumber,
          }),
          url: `/order-success?order=${encodeURIComponent(order.orderNumber)}`,
        });

        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            } satisfies WebPushSubscription,
            payload
          );
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? error.statusCode
              : undefined;

          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.deleteMany({
              where: { id: subscription.id },
            });
            return;
          }

          console.error("WEB_PUSH_DELIVERY_ERROR:", error);
        }
      })
    );
  } catch (error) {
    console.error("WEB_PUSH_NOTIFICATION_ERROR:", error);
  }
}
