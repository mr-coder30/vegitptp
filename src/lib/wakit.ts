/*
 * Server-only Wakit WhatsApp OTP client.
 *
 * Official documentation: https://wakit.in/docs
 *
 * Endpoints used (base URL https://wakit.in/api/v1):
 *
 *   POST /otp/send     { to: "+91XXXXXXXXXX" }
 *                      -> 201 {
 *                           success: true,
 *                           data: {
 *                             id, to, status, channel, expires_at
 *                           }
 *                         }
 *
 *   POST /otp/verify   { id, code }
 *                      -> 200 {
 *                           success: true,
 *                           data: { verified: boolean, status: string }
 *                         }
 *                       Each call consumes one attempt.
 *
 *   GET  /otp/{id}     -> delivery status of one send:
 *                         pending | sent | delivered | read |
 *                         verified | failed | expired
 *
 * Authentication:
 *
 *   Authorization: Bearer <WAKIT_API_KEY>
 *
 * The API key is read from a server-only environment variable. It
 * is never exposed to browser code, never placed in a
 * NEXT_PUBLIC variable, never included in a response body and
 * never written to a log. OTP codes are never logged either.
 *
 * Error handling follows the documented error table: classify by
 * HTTP status first (401 auth, 403 ip_not_allowed, 402
 * insufficient_balance, 422 validation, 404 not_found, 429, 502
 * send_error), and treat an unparsable body as a provider
 * failure. Nothing from the provider response is passed to the
 * caller except the OTP message id and the classification.
 *
 * Wakit is the only customer OTP provider. When it fails, the
 * caller receives a safe failure and reports it to the customer.
 */

const WAKIT_BASE_URL = "https://wakit.in/api/v1";

const REQUEST_TIMEOUT_MS = 10_000;

const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

const OTP_CODE_PATTERN = /^\d{6}$/;

export type WakitFailureKind =
  | "not_configured"
  | "timeout"
  | "network"
  | "malformed"
  | "rate_limited"
  | "auth"
  | "balance"
  | "rejected"
  | "not_found"
  | "incorrect"
  | "provider";

export type WakitFailure = {
  ok: false;
  kind: WakitFailureKind;
  httpStatus: number | null;
  retryAfterSeconds: number | null;
};

export type WakitSendResult =
  | {
      ok: true;
      /*
       * Wakit message id. Stored in OtpRequest.verificationId and
       * sent to the browser only inside the HttpOnly temporary
       * verification cookie.
       */
      id: string;
      /*
       * ISO timestamp from data.expires_at, when the provider
       * returns one. Advisory only: expiry is enforced by Wakit
       * during verification and locally by the OTP session age.
       */
      expiresAt: string | null;
    }
  | WakitFailure;

export type WakitVerifyResult =
  | { ok: true }
  | WakitFailure;

function failure(
  kind: WakitFailureKind,
  httpStatus: number | null = null,
  retryAfterSeconds: number | null = null
): WakitFailure {
  return {
    ok: false,
    kind,
    httpStatus,
    retryAfterSeconds,
  };
}

export function isWakitConfigured(): boolean {
  return Boolean(
    process.env.WAKIT_API_KEY?.trim()
  );
}

/**
 * Normalise the stored 10-digit Indian mobile number into the
 * full international format Wakit expects, or null when the value
 * does not match the project's existing validation rule.
 */
export function formatWakitRecipient(
  phone: string
): string | null {
  if (!INDIAN_MOBILE_PATTERN.test(phone)) {
    return null;
  }

  return `+91${phone}`;
}

type RawCall = {
  transport: "timeout" | "network" | null;
  httpStatus: number;
  ok: boolean;
  /*
   * Parsed JSON body, or null when the body was empty or was not
   * valid JSON.
   */
  payload: unknown;
  malformedBody: boolean;
  retryAfterSeconds: number | null;
};

function readRetryAfterSeconds(
  response: Response
): number | null {
  const header =
    response.headers.get("retry-after");

  if (!header) {
    return null;
  }

  const seconds = Number.parseInt(header, 10);

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return null;
  }

  /*
   * Bound the value so a hostile or broken header cannot produce
   * an absurd Retry-After.
   */

  return Math.min(seconds, 24 * 60 * 60);
}

async function requestJson(
  path: string,
  method: "GET" | "POST",
  body?: unknown
): Promise<RawCall> {
  const apiKey =
    process.env.WAKIT_API_KEY?.trim();

  /*
   * Defensive: the public entry points check this first, so a
   * missing key can never reach the network layer.
   */

  if (!apiKey) {
    return {
      transport: null,
      httpStatus: 0,
      ok: false,
      payload: null,
      malformedBody: false,
      retryAfterSeconds: null,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  let response: Response;

  try {
    response = await fetch(
      `${WAKIT_BASE_URL}${path}`,
      {
        method,
        headers,
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(
          REQUEST_TIMEOUT_MS
        ),
      }
    );
  } catch (error) {
    /*
     * Never log the caught value: transport errors can carry
     * request details. The caller logs only the classification.
     */

    const name =
      error instanceof Error
        ? error.name
        : "";

    return {
      transport:
        name === "TimeoutError" ||
        name === "AbortError"
          ? "timeout"
          : "network",
      httpStatus: 0,
      ok: false,
      payload: null,
      malformedBody: false,
      retryAfterSeconds: null,
    };
  }

  /*
   * Read as text first because the provider may occasionally
   * return an empty body.
   */

  let rawBody = "";

  try {
    rawBody = await response.text();
  } catch {
    return {
      transport: "network",
      httpStatus: response.status,
      ok: false,
      payload: null,
      malformedBody: false,
      retryAfterSeconds:
        readRetryAfterSeconds(response),
    };
  }

  let payload: unknown = null;
  let malformedBody = false;

  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      malformedBody = true;
    }
  }

  return {
    transport: null,
    httpStatus: response.status,
    ok: response.ok,
    payload,
    malformedBody,
    retryAfterSeconds:
      readRetryAfterSeconds(response),
  };
}

function readField(
  value: unknown,
  field: string
): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  return (value as Record<string, unknown>)[
    field
  ];
}

function classifyHttpError(
  call: RawCall,
  endpoint: "send" | "verify"
): WakitFailureKind {
  if (call.httpStatus === 0) {
    return "provider";
  }

  switch (call.httpStatus) {
    case 401:
    case 403:
      return "auth";
    case 402:
      return "balance";
    case 429:
      return "rate_limited";
    case 404:
      return "not_found";
    case 422:
      return "rejected";
    case 502:
      /*
       * 502 send_error means WhatsApp rejected the message: for
       * sending that is a definitive answer for this number, for
       * verifying it is treated like any other upstream failure.
       */
      return endpoint === "send"
        ? "rejected"
        : "provider";
    default:
      return call.httpStatus >= 500
        ? "provider"
        : "rejected";
  }
}

/**
 * Send a WhatsApp OTP through Wakit for the given 10-digit Indian
 * mobile number.
 *
 * Never throws: every failure is returned as a classified result
 * so the route can map it to a safe customer-facing message.
 */
export async function sendWakitOtp(
  phone: string
): Promise<WakitSendResult> {
  if (!isWakitConfigured()) {
    return failure("not_configured");
  }

  const to = formatWakitRecipient(phone);

  if (!to) {
    return failure("rejected");
  }

  const call = await requestJson(
    "/otp/send",
    "POST",
    { to }
  );

  if (call.transport) {
    return failure(call.transport);
  }

  if (call.malformedBody || call.payload === null) {
    return failure(
      "malformed",
      call.httpStatus
    );
  }

  if (!call.ok) {
    return failure(
      classifyHttpError(call, "send"),
      call.httpStatus,
      call.retryAfterSeconds
    );
  }

  const success = readField(
    call.payload,
    "success"
  );

  const id = readField(
    readField(call.payload, "data"),
    "id"
  );

  const expiresAt = readField(
    readField(call.payload, "data"),
    "expires_at"
  );

  if (
    success !== true ||
    typeof id !== "string" ||
    !id
  ) {
    return failure(
      "malformed",
      call.httpStatus
    );
  }

  return {
    ok: true,
    id,
    expiresAt:
      typeof expiresAt === "string"
        ? expiresAt
        : null,
  };
}

/**
 * Verify a 6-digit code against a Wakit message id.
 *
 * Never throws. `kind: "incorrect"` means the provider answered
 * the request but the code did not match; the caller decides
 * whether to keep the OTP session alive and how many attempts to
 * allow.
 */
export async function verifyWakitOtp(
  id: string,
  code: string
): Promise<WakitVerifyResult> {
  if (!isWakitConfigured()) {
    return failure("not_configured");
  }

  if (
    !id ||
    !OTP_CODE_PATTERN.test(code)
  ) {
    return failure("rejected");
  }

  const call = await requestJson(
    "/otp/verify",
    "POST",
    { id, code }
  );

  if (call.transport) {
    return failure(call.transport);
  }

  if (call.malformedBody || call.payload === null) {
    return failure(
      "malformed",
      call.httpStatus
    );
  }

  if (!call.ok) {
    return failure(
      classifyHttpError(call, "verify"),
      call.httpStatus,
      call.retryAfterSeconds
    );
  }

  const success = readField(
    call.payload,
    "success"
  );

  if (success !== true) {
    return failure(
      "malformed",
      call.httpStatus
    );
  }

  const data = readField(
    call.payload,
    "data"
  );

  const verified = readField(
    data,
    "verified"
  );

  const status = readField(data, "status");

  if (
    verified === true ||
    status === "verified"
  ) {
    return { ok: true };
  }

  /*
   * The provider answered and did not confirm the code. Both
   * `verified: false` and an unrecognised non-verified payload
   * are treated as an incorrect code: no session is ever created
   * from an unconfirmed response.
   */

  return failure(
    "incorrect",
    call.httpStatus
  );
}

/**
 * Read the current status of a Wakit OTP send.
 *
 * Used to tell an expired or already-verified OTP apart from a
 * simple wrong code. Returns null whenever the status cannot be
 * read so the caller can fall back to the safe behaviour.
 */
export async function getWakitOtpStatus(
  id: string
): Promise<string | null> {
  if (
    !isWakitConfigured() ||
    !id
  ) {
    return null;
  }

  const call = await requestJson(
    `/otp/${encodeURIComponent(id)}`,
    "GET"
  );

  if (
    call.transport ||
    !call.ok ||
    call.malformedBody
  ) {
    return null;
  }

  const status = readField(
    readField(call.payload, "data"),
    "status"
  );

  return typeof status === "string"
    ? status
    : null;
}
