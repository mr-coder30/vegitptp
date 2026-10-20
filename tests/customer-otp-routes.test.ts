/*
 * Route-level tests for the customer OTP flow.
 *
 * The Prisma client and next/headers are replaced with in-memory
 * fakes; every Wakit request is answered by a mocked fetch. No
 * database is touched, no real OTP is sent and no Wakit credit is
 * consumed.
 *
 * Because the routes are imported after the module mocks are
 * registered, this file must not statically import them.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  captureConsole,
  createCookieStore,
  createFakePrisma,
  installFetchMock,
  jsonResponse,
  sha256,
} from "./helpers/fakes";

const TEST_API_KEY =
  "wk_live_unit_test_key_never_leak";

const PHONE = "9876543210";

const OTP_VERIFICATION_COOKIE =
  "vegitptp-otp-verification-id";

const OTP_PHONE_COOKIE = "vegitptp-otp-phone";

const CUSTOMER_SESSION_COOKIE =
  "vegitptp-customer";

const WAKIT_SEND_URL =
  "https://wakit.in/api/v1/otp/send";

const WAKIT_VERIFY_URL =
  "https://wakit.in/api/v1/otp/verify";

type ModuleMockFn = (
  specifier: string,
  options: Record<string, unknown>
) => void;

type CustomerOtpContext = {
  send: typeof import("../src/app/api/auth/send-otp/route");
  verify: typeof import("../src/app/api/auth/verify-otp/route");
  state: ReturnType<typeof createFakePrisma>["state"];
  jar: ReturnType<typeof createCookieStore>["jar"];
  setOptions: ReturnType<typeof createCookieStore>["setOptions"];
  deletes: ReturnType<typeof createCookieStore>["deletes"];
};

let context: CustomerOtpContext | undefined;
let state: CustomerOtpContext["state"];
let jar: CustomerOtpContext["jar"];
let setOptions: CustomerOtpContext["setOptions"];
let deletes: CustomerOtpContext["deletes"];
let otpSeedCounter = 0;

async function loadRoutesWithContext(
  testContext: unknown
): Promise<CustomerOtpContext> {
  if (context) {
    return context;
  }

  const { prisma, state: fakeState } = createFakePrisma();
  const {
    jar: fakeJar,
    store,
    setOptions: fakeSetOptions,
    deletes: fakeDeletes,
  } = createCookieStore();

  const mockTracker = (
    testContext as {
      mock: { module: ModuleMockFn };
    }
  ).mock;

  mockTracker.module(
    "next/headers",
    {
      exports: {
        cookies: async () => store,
      },
    }
  );

  mockTracker.module(
    "@/lib/prisma",
    {
      exports: { prisma },
    }
  );

  process.env.WAKIT_API_KEY = TEST_API_KEY;

  const [send, verify] = await Promise.all([
    import("../src/app/api/auth/send-otp/route"),
    import("../src/app/api/auth/verify-otp/route"),
  ]);

  context = {
    send,
    verify,
    state: fakeState,
    jar: fakeJar,
    setOptions: fakeSetOptions,
    deletes: fakeDeletes,
  };

  state = fakeState;
  jar = fakeJar;
  setOptions = fakeSetOptions;
  deletes = fakeDeletes;

  return context;
}

function loadRoutes(): CustomerOtpContext {
  if (!context) {
    throw new Error("Customer OTP test routes have not been loaded.");
  }

  return context;
}

function reset() {
  if (!context) {
    throw new Error("Customer OTP test context has not been loaded.");
  }

  state.otpRequests.length = 0;
  state.customers.length = 0;
  state.customerSessions.length = 0;
  state.adminSessions.length = 0;
  state.deliverySessions.length = 0;
  state.adminLoginAttempts.length = 0;
  state.deliveryLoginAttempts.length = 0;
  state.customerSessionCreates = 0;
  state.adminSessionCreates = 0;
  state.deliverySessionCreates = 0;
  state.customerUpsertFailures = 0;
  state.otpRequestConsumeMode = "normal";
  jar.clear();
  setOptions.clear();
  deletes.length = 0;
  process.env.WAKIT_API_KEY = TEST_API_KEY;
}

function seedOtpSession(options: {
  createdAt?: Date;
  phoneHash?: string;
} = {}) {
  otpSeedCounter += 1;

  const verificationId =
    SEND_SUCCESS_BODY.data.id;

  state.otpRequests.push({
    id: `otp-test-${otpSeedCounter}`,
    phoneHash:
      options.phoneHash ?? sha256(PHONE),
    ipHash: null,
    verificationId,
    createdAt:
      options.createdAt ?? new Date(),
  });

  jar.set(
    OTP_VERIFICATION_COOKIE,
    verificationId
  );

  jar.set(OTP_PHONE_COOKIE, PHONE);
}

function postJson(
  path: string,
  body: unknown
) {
  return new Request(
    `http://localhost${path}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

const SEND_SUCCESS_BODY = {
  success: true,
  data: {
    id: "019f6da2-e20f-717f-8c21-76f93f58992e",
    to: "+919876543210",
    status: "sent",
    channel: "whatsapp",
    expires_at:
      "2026-10-19T12:00:00+00:00",
  },
};

const VERIFY_SUCCESS_BODY = {
  success: true,
  data: {
    verified: true,
    status: "verified",
  },
};

const VERIFY_INCORRECT_BODY = {
  success: true,
  data: {
    verified: false,
    status: "sent",
  },
};

type SendBody = {
  success?: boolean;
  message?: string;
  timeout?: unknown;
  resendAfterSeconds?: number;
  remainingRequests?: number;
  error?: string;
  retryAfterSeconds?: number;
};

type VerifyBody = {
  success?: boolean;
  message?: string;
  error?: string;
  customer?: {
    id: string;
    phone: string;
    name: string;
  };
};

/* ------------------------------------------------------------------ *
 * send-otp
 * ------------------------------------------------------------------ */

test("send-otp returns the existing contract and stores no session", async (t) => {
  const ctx = await loadRoutesWithContext(t);
  reset();

  const calls = installFetchMock(() =>
    jsonResponse(SEND_SUCCESS_BODY, 201)
  );

  const response = await ctx.send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  const body =
    (await response.json()) as SendBody;

  assert.equal(response.status, 200);

  assert.equal(body.success, true);

  assert.equal(body.timeout, null);

  assert.equal(body.resendAfterSeconds, 60);

  assert.equal(body.remainingRequests, 2);

  assert.equal(
    response.headers.get("cache-control"),
    "no-store"
  );

  assert.equal(calls.length, 1);

  assert.equal(calls[0].url, WAKIT_SEND_URL);

  assert.deepEqual(
    JSON.parse(calls[0].body ?? "null"),
    { to: "+919876543210" }
  );

  assert.equal(ctx.state.otpRequests.length, 1);

  assert.equal(
    ctx.state.otpRequests[0].verificationId,
    SEND_SUCCESS_BODY.data.id
  );

  assert.equal(
    ctx.jar.get(OTP_VERIFICATION_COOKIE),
    SEND_SUCCESS_BODY.data.id
  );

  assert.equal(ctx.jar.get(OTP_PHONE_COOKIE), PHONE);

  /* No customer session and no account before verification. */
  assert.equal(
    ctx.jar.has(CUSTOMER_SESSION_COOKIE),
    false
  );

  assert.equal(
    ctx.state.customerSessionCreates,
    0
  );

  assert.equal(ctx.state.customers.length, 0);
});

test("send-otp keeps the 60-second resend cooldown without a second provider call", async () => {
  reset();

  const calls = installFetchMock(() =>
    jsonResponse(SEND_SUCCESS_BODY, 201)
  );

  const { send } = await loadRoutes();

  const first = await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  assert.equal(first.status, 200);

  const second = await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  const body =
    (await second.json()) as SendBody;

  assert.equal(second.status, 429);

  assert.equal(
    typeof body.retryAfterSeconds,
    "number"
  );

  assert.ok(
    second.headers.get("retry-after")
  );

  assert.equal(calls.length, 1);

  assert.equal(state.otpRequests.length, 1);
});

test("send-otp maps a Wakit failure to a safe 503 and stores nothing", async () => {
  reset();

  installFetchMock(() =>
    jsonResponse(
      {
        success: false,
        type: "send_error",
        message: "internal provider detail",
      },
      502
    )
  );

  const { send } = await loadRoutes();

  const response = await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  const body =
    (await response.json()) as SendBody;

  assert.equal(response.status, 503);

  assert.match(
    body.error ?? "",
    /WhatsApp/
  );

  assert.ok(
    !(body.error ?? "").includes(
      TEST_API_KEY
    )
  );

  assert.equal(state.otpRequests.length, 0);

  assert.equal(
    state.customerSessionCreates,
    0
  );

  assert.equal(jar.size, 0);
});

test("send-otp maps a provider timeout to a safe 503", async () => {
  reset();

  installFetchMock(() => {
    const error = new Error("timed out");

    error.name = "TimeoutError";

    throw error;
  });

  const { send } = await loadRoutes();

  const response = await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  assert.equal(response.status, 503);

  assert.equal(state.otpRequests.length, 0);
});

test("send-otp maps provider rate limiting to 429", async () => {
  reset();

  installFetchMock(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          type: "rate_limited",
        }),
        {
          status: 429,
          headers: {
            "content-type":
              "application/json",
            "retry-after": "30",
          },
        }
      )
  );

  const { send } = await loadRoutes();

  const response = await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  const body =
    (await response.json()) as SendBody;

  assert.equal(response.status, 429);

  assert.equal(body.retryAfterSeconds, 30);

  assert.equal(state.otpRequests.length, 0);
});

test("send-otp returns not configured without calling the provider when the key is missing", async () => {
  reset();

  const calls = installFetchMock(() =>
    jsonResponse(SEND_SUCCESS_BODY, 201)
  );

  delete process.env.WAKIT_API_KEY;

  try {
    const { send } = await loadRoutes();

    const response = await send.POST(
      postJson("/api/auth/send-otp", {
        phone: PHONE,
      })
    );

    const body =
      (await response.json()) as SendBody;

    assert.equal(response.status, 500);

    assert.match(
      body.error ?? "",
      /not configured/i
    );
  } finally {
    process.env.WAKIT_API_KEY =
      TEST_API_KEY;
  }

  assert.equal(calls.length, 0);

  assert.equal(state.otpRequests.length, 0);
});

/* ------------------------------------------------------------------ *
 * verify-otp
 * ------------------------------------------------------------------ */

test("verify-otp completes the full flow and creates a hashed session only after verification", async () => {
  reset();

  installFetchMock((call) => {
    if (call.url === WAKIT_SEND_URL) {
      return jsonResponse(
        SEND_SUCCESS_BODY,
        201
      );
    }

    if (call.url === WAKIT_VERIFY_URL) {
      return jsonResponse(
        VERIFY_SUCCESS_BODY,
        200
      );
    }

    return jsonResponse(
      { success: false },
      404
    );
  });

  const { send, verify } =
    await loadRoutes();

  const sendResponse = await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  assert.equal(sendResponse.status, 200);

  assert.equal(
    state.customerSessionCreates,
    0
  );

  const verifyResponse =
    await verify.POST(
      postJson("/api/auth/verify-otp", {
        code: "123456",
      })
    );

  const body =
    (await verifyResponse.json()) as VerifyBody;

  assert.equal(verifyResponse.status, 200);

  assert.equal(body.success, true);

  assert.equal(
    body.customer?.phone,
    PHONE
  );

  assert.equal(
    state.customers.length,
    1
  );

  assert.equal(
    state.customerSessionCreates,
    1
  );

  assert.equal(state.customerSessions.length, 1);

  const sessionCookie = jar.get(
    CUSTOMER_SESSION_COOKIE
  );

  assert.ok(sessionCookie);

  /* Only a SHA-256 hash of the session token is stored. */
  assert.equal(
    state.customerSessions[0].tokenHash,
    sha256(sessionCookie as string)
  );

  assert.notEqual(
    state.customerSessions[0].tokenHash,
    sessionCookie
  );

  const sessionOptions = setOptions.get(
    CUSTOMER_SESSION_COOKIE
  );

  assert.equal(
    sessionOptions?.httpOnly,
    true
  );

  assert.equal(
    sessionOptions?.sameSite,
    "lax"
  );

  assert.equal(
    sessionOptions?.path,
    "/"
  );

  /* The OTP is single-use: consumed and cookies cleared. */
  assert.equal(
    state.otpRequests.length,
    0
  );

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );

  assert.equal(
    jar.has(OTP_PHONE_COOKIE),
    false
  );
});

test("verify-otp rejects an incorrect code and keeps the session alive", async () => {
  reset();
  seedOtpSession();

  installFetchMock(() =>
    jsonResponse(VERIFY_INCORRECT_BODY, 200)
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "000000",
    })
  );

  const body =
    (await response.json()) as VerifyBody;

  assert.equal(response.status, 400);

  assert.match(
    body.error ?? "",
    /Incorrect/
  );

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    true
  );

  assert.equal(
    jar.has(CUSTOMER_SESSION_COOKIE),
    false
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );

  assert.equal(state.customers.length, 0);

  assert.equal(state.otpRequests.length, 1);
});

test("verify-otp blocks the session after five incorrect attempts", async () => {
  reset();
  seedOtpSession();

  const calls = installFetchMock(() =>
    jsonResponse(VERIFY_INCORRECT_BODY, 200)
  );

  const { verify } = await loadRoutes();

  for (
    let attempt = 1;
    attempt <= 4;
    attempt += 1
  ) {
    const response = await verify.POST(
      postJson("/api/auth/verify-otp", {
        code: "000000",
      })
    );

    assert.equal(response.status, 400);
  }

  const blocked = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "000000",
    })
  );

  const blockedBody =
    (await blocked.json()) as VerifyBody;

  assert.equal(blocked.status, 429);

  assert.match(
    blockedBody.error ?? "",
    /Too many verification attempts/
  );

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );

  /* A further attempt cannot even reach the provider. */
  const after = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "000000",
    })
  );

  assert.equal(after.status, 400);

  assert.equal(calls.length, 5);

  assert.equal(
    state.customerSessionCreates,
    0
  );
});

test("verify-otp rejects an expired local OTP session without contacting Wakit", async () => {
  reset();

  seedOtpSession({
    createdAt: new Date(
      Date.now() - 11 * 60 * 1000
    ),
  });

  const calls = installFetchMock(() =>
    jsonResponse(VERIFY_SUCCESS_BODY, 200)
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  const body =
    (await response.json()) as VerifyBody;

  assert.equal(response.status, 400);

  assert.match(body.error ?? "", /expired/);

  assert.equal(calls.length, 0);

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );
});

test("verify-otp treats a provider 404 as an expired OTP", async () => {
  reset();
  seedOtpSession();

  installFetchMock(() =>
    jsonResponse(
      { success: false, type: "not_found" },
      404
    )
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  const body =
    (await response.json()) as VerifyBody;

  assert.equal(response.status, 400);

  assert.match(body.error ?? "", /expired/);

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );
});

test("verify-otp clears the session when the provider rate limits verification", async () => {
  reset();
  seedOtpSession();

  installFetchMock(() =>
    jsonResponse(
      { success: false, type: "rate_limited" },
      429
    )
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  const body =
    (await response.json()) as VerifyBody;

  assert.equal(response.status, 429);

  assert.match(
    body.error ?? "",
    /Too many verification attempts/
  );

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );
});

test("verify-otp never creates a session when a concurrent request already consumed the OTP", async () => {
  reset();
  seedOtpSession();

  state.otpRequestConsumeMode = "consume_fails";

  installFetchMock(() =>
    jsonResponse(VERIFY_SUCCESS_BODY, 200)
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  const body =
    (await response.json()) as VerifyBody;

  assert.equal(response.status, 400);

  assert.match(
    body.error ?? "",
    /already been used/
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );

  assert.equal(
    jar.has(CUSTOMER_SESSION_COOKIE),
    false
  );

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );
});

test("verify-otp consumes the OTP so a replay cannot create a second session", async () => {
  reset();
  seedOtpSession();

  installFetchMock(() =>
    jsonResponse(VERIFY_SUCCESS_BODY, 200)
  );

  const { verify } = await loadRoutes();

  const first = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  assert.equal(first.status, 200);

  assert.equal(
    state.customerSessionCreates,
    1
  );

  const second = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  assert.equal(second.status, 400);

  assert.equal(
    state.customerSessionCreates,
    1
  );

  assert.equal(state.customerSessions.length, 1);
});

test("verify-otp keeps the session for transient provider failures", async () => {
  const scenarios: Array<{
    name: string;
    respond: () => Response;
    expectedStatus: number;
  }> = [
    {
      name: "provider 500",
      respond: () =>
        jsonResponse({ success: false }, 500),
      expectedStatus: 502,
    },
    {
      name: "malformed body",
      respond: () =>
        new Response("not json", {
          status: 200,
        }),
      expectedStatus: 502,
    },
    {
      name: "timeout",
      respond: () => {
        const error = new Error("timeout");

        error.name = "TimeoutError";

        throw error;
      },
      expectedStatus: 504,
    },
  ];

  for (const scenario of scenarios) {
    reset();
    seedOtpSession();

    installFetchMock(scenario.respond);

    const { verify } = await loadRoutes();

    const response = await verify.POST(
      postJson("/api/auth/verify-otp", {
        code: "123456",
      })
    );

    assert.equal(
      response.status,
      scenario.expectedStatus,
      scenario.name
    );

    assert.equal(
      jar.has(OTP_VERIFICATION_COOKIE),
      true,
      scenario.name
    );

    assert.equal(
      state.customerSessionCreates,
      0,
      scenario.name
    );
  }
});

test("verify-otp uses the delivery status to tell reused and expired apart", async () => {
  const scenarios: Array<{
    status: string;
    expectedError: RegExp;
    clearsSession: boolean;
  }> = [
    {
      status: "verified",
      expectedError: /already been used/,
      clearsSession: true,
    },
    {
      status: "expired",
      expectedError: /expired/,
      clearsSession: true,
    },
    {
      status: "sent",
      expectedError: /Incorrect/,
      clearsSession: false,
    },
  ];

  for (const scenario of scenarios) {
    reset();
    seedOtpSession();

    installFetchMock((call) => {
      if (call.url === WAKIT_VERIFY_URL) {
        return jsonResponse(
          { success: false, type: "validation_error" },
          422
        );
      }

      return jsonResponse(
        {
          success: true,
          data: { status: scenario.status },
        },
        200
      );
    });

    const { verify } = await loadRoutes();

    const response = await verify.POST(
      postJson("/api/auth/verify-otp", {
        code: "123456",
      })
    );

    const body =
      (await response.json()) as VerifyBody;

    assert.equal(response.status, 400);

    assert.match(
      body.error ?? "",
      scenario.expectedError,
      scenario.status
    );

    assert.equal(
      jar.has(OTP_VERIFICATION_COOKIE),
      !scenario.clearsSession,
      scenario.status
    );

    assert.equal(
      state.customerSessionCreates,
      0
    );
  }
});

test("verify-otp returns not configured and keeps the session when the key is missing", async () => {
  reset();
  seedOtpSession();

  const calls = installFetchMock(() =>
    jsonResponse(VERIFY_SUCCESS_BODY, 200)
  );

  delete process.env.WAKIT_API_KEY;

  try {
    const { verify } = await loadRoutes();

    const response = await verify.POST(
      postJson("/api/auth/verify-otp", {
        code: "123456",
      })
    );

    const body =
      (await response.json()) as VerifyBody;

    assert.equal(response.status, 500);

    assert.match(
      body.error ?? "",
      /not configured/i
    );
  } finally {
    process.env.WAKIT_API_KEY =
      TEST_API_KEY;
  }

  assert.equal(calls.length, 0);

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    true
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );
});

test("verify-otp rejects a phone that does not match the bound OTP", async () => {
  reset();

  seedOtpSession({
    phoneHash: sha256("9000000000"),
  });

  const calls = installFetchMock(() =>
    jsonResponse(VERIFY_SUCCESS_BODY, 200)
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  assert.equal(response.status, 400);

  assert.equal(calls.length, 0);

  assert.equal(
    jar.has(OTP_VERIFICATION_COOKIE),
    false
  );

  assert.equal(
    state.customerSessionCreates,
    0
  );
});

test("verify-otp reuses the existing customer when a registration race loses", async () => {
  reset();
  seedOtpSession();

  state.customers.push({
    id: "cust-existing",
    name: "",
    phone: PHONE,
    address: "",
    landmark: null,
    locality: null,
  });

  state.customerUpsertFailures = 1;

  installFetchMock(() =>
    jsonResponse(VERIFY_SUCCESS_BODY, 200)
  );

  const { verify } = await loadRoutes();

  const response = await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "123456",
    })
  );

  const body =
    (await response.json()) as VerifyBody;

  assert.equal(response.status, 200);

  assert.equal(
    body.customer?.id,
    "cust-existing"
  );

  /* Still exactly one account: no duplicate registration. */
  assert.equal(state.customers.length, 1);

  assert.equal(
    state.customerSessionCreates,
    1
  );

  assert.equal(
    state.customerSessions[0].customerId,
    "cust-existing"
  );
});

/* ------------------------------------------------------------------ *
 * Provider hygiene
 * ------------------------------------------------------------------ */

test("customer OTP requests use only the Wakit API", async () => {
  reset();

  const calls = installFetchMock((call) => {
    if (call.url === WAKIT_SEND_URL) {
      return jsonResponse(SEND_SUCCESS_BODY, 201);
    }

    if (call.url === WAKIT_VERIFY_URL) {
      return jsonResponse(
        VERIFY_INCORRECT_BODY,
        200
      );
    }

    return jsonResponse({ success: false }, 404);
  });

  const { send, verify } = await loadRoutes();

  await send.POST(
    postJson("/api/auth/send-otp", {
      phone: PHONE,
    })
  );

  await verify.POST(
    postJson("/api/auth/verify-otp", {
      code: "000000",
    })
  );

  assert.ok(calls.length >= 2);

  for (const call of calls) {
    assert.ok(
      call.url.startsWith(
        "https://wakit.in/api/v1/"
      ),
      call.url
    );

    assert.ok(
      !call.url.includes(TEST_API_KEY)
    );
  }
});

test("responses and logs never contain the API key or the OTP", async () => {
  reset();

  const captured = captureConsole();

  const bodies: string[] = [];

  try {
    const calls = installFetchMock((call) => {
      if (call.url === WAKIT_SEND_URL) {
        return jsonResponse(
          SEND_SUCCESS_BODY,
          201
        );
      }

      if (call.url === WAKIT_VERIFY_URL) {
        return jsonResponse(
          VERIFY_INCORRECT_BODY,
          200
        );
      }

      return jsonResponse(
        { success: false, type: "send_error" },
        502
      );
    });

    const { send, verify } =
      await loadRoutes();

    const sendResponse = await send.POST(
      postJson("/api/auth/send-otp", {
        phone: PHONE,
      })
    );

    bodies.push(await sendResponse.text());

    const verifyResponse = await verify.POST(
      postJson("/api/auth/verify-otp", {
        code: "123456",
      })
    );

    bodies.push(await verifyResponse.text());

    /* A failing send records the failure classification only. */
    installFetchMock(() =>
      jsonResponse(
        { success: false, type: "send_error" },
        502
      )
    );

    /* A different number avoids the resend cooldown so the
     * provider-failure path is the one being exercised. */
    const failing = await send.POST(
      postJson("/api/auth/send-otp", {
        phone: "9000000001",
      })
    );

    bodies.push(await failing.text());

    assert.ok(calls.length >= 2);
  } finally {
    captured.restore();
  }

  for (const body of bodies) {
    assert.ok(
      !body.includes(TEST_API_KEY),
      body
    );

    assert.ok(!body.includes("Bearer"));

    assert.ok(!body.includes("123456"));
  }

  assert.ok(captured.entries.length > 0);

  for (const entry of captured.entries) {
    assert.ok(
      !entry.includes(TEST_API_KEY),
      entry
    );

    assert.ok(!/bearer/i.test(entry));

    assert.ok(
      !entry.includes("123456"),
      entry
    );
  }
});
