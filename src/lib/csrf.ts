export function isSameOrigin(
  request: Request
): boolean {
  const origin = request.headers.get("origin");

  /*
   * Some legitimate requests may not contain an Origin
   * header. We don't reject those solely because the
   * header is absent.
   *
   * SameSite=Lax remains the primary browser-side
   * CSRF protection.
   */
  if (!origin) {
    return true;
  }

  const configuredAppUrl =
    process.env.APP_URL;

  /*
   * Fail closed if the application origin has not
   * been configured.
   */
  if (!configuredAppUrl) {
    console.error(
      "APP_URL is not configured."
    );

    return false;
  }

  try {
    const expectedOrigin =
      new URL(
        configuredAppUrl
      ).origin;

    return origin === expectedOrigin;
  } catch {
    console.error(
      "APP_URL is invalid."
    );

    return false;
  }
}