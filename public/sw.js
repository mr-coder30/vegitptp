self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "VegItPTP";
  const options = {
    body: payload.body || "Your order has an update.",
    icon: "/vegitptp-icon.png",
    badge: "/vegitptp-icon.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );
  const targetUrl =
    requestedUrl.origin === self.location.origin
      ? requestedUrl.href
      : self.location.origin;

  event.waitUntil(self.clients.openWindow(targetUrl));
});
