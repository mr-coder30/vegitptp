/*
 * Regression tests for the mechanisms that must stay untouched:
 * customer logout/session handling and the admin/delivery
 * password authentication flows (which never use an OTP provider).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import {
  createCookieStore,
  createFakePrisma,
  installFetchMock,
  jsonResponse,
  sha256,
} from "./helpers/fakes";

const { prisma, state } = createFakePrisma();

const { jar, store } = createCookieStore();

type ModuleMockFn = (
  specifier: string,
  options: {
    exports: Record<string, unknown>;
  }
) => void;

let mocksRegistered = false;

/*
 * node:test module mocks can only be registered from inside a test
 * context, so registration is deferred until the first route import.
 */
function ensureMocks(testContext: unknown) {
  if (mocksRegistered) {
    return;
  }

  const mockTracker = (
    testContext as {
      mock: { module: ModuleMockFn };
    }
  ).mock;

  mockTracker.module("next/headers", {
    exports: {
      cookies: async () => store,
    },
  });

  mockTracker.module("@/lib/prisma", {
    exports: { prisma },
  });

  mocksRegistered = true;
}

let routesPromise: Promise<{
  adminLogin: typeof import(
    "../src/app/api/admin/login/route"
  );
  deliveryLogin: typeof import(
    "../src/app/api/delivery/login/route"
  );
  logout: typeof import(
    "../src/app/api/customer/logout/route"
  );
}> | null = null;

function loadRoutes(testContext: unknown) {
  ensureMocks(testContext);

  if (!routesPromise) {
    routesPromise = Promise.all([
      import(
        "../src/app/api/admin/login/route"
      ),
      import(
        "../src/app/api/delivery/login/route"
      ),
      import(
        "../src/app/api/customer/logout/route"
      ),
    ]).then(
      ([adminLogin, deliveryLogin, logout]) => ({
        adminLogin,
        deliveryLogin,
        logout,
      })
    );
  }

  return routesPromise;
}

function reset() {
  state.customers.length = 0;
  state.customerSessions.length = 0;
  state.adminSessions.length = 0;
  state.deliverySessions.length = 0;
  state.adminLoginAttempts.length = 0;
  state.deliveryLoginAttempts.length = 0;
  state.admins.length = 0;
  state.deliveryBoys.length = 0;

  state.customerSessionCreates = 0;
  state.adminSessionCreates = 0;
  state.deliverySessionCreates = 0;

  jar.clear();
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

test("customer logout deletes the stored session and clears the cookie", async (t) => {
  reset();

  const token = "customer-session-token";

  jar.set("vegitptp-customer", token);

  state.customerSessions.push({
    id: "csess-1",
    customerId: "cust-1",
    tokenHash: sha256(token),
    expiresAt: new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ),
  });

  const { logout } = await loadRoutes(t);

  const response = await logout.POST();

  const body =
    (await response.json()) as {
      success?: boolean;
    };

  assert.equal(response.status, 200);

  assert.equal(body.success, true);

  assert.equal(
    jar.has("vegitptp-customer"),
    false
  );

  assert.equal(
    state.customerSessions.length,
    0
  );
});

test("admin login still issues a session for correct credentials and none for wrong ones", async (t) => {
  reset();

  state.admins.push({
    id: "admin-1",
    username: "adminuser",
    passwordHash: bcrypt.hashSync(
      "correct-password",
      4
    ),
    isActive: true,
  });

  const providerCalls = installFetchMock(() =>
    jsonResponse({ success: true }, 200)
  );

  const { adminLogin } = await loadRoutes(t);

  const success =
    await adminLogin.POST(
      postJson("/api/admin/login", {
        username: "adminuser",
        password: "correct-password",
      })
    );

  assert.equal(success.status, 200);

  const adminCookie =
    success.cookies.get("vegitptp-admin");

  assert.ok(adminCookie);

  assert.equal(
    adminCookie?.httpOnly,
    true
  );

  assert.equal(state.adminSessionCreates, 1);

  assert.equal(
    state.adminSessions[0].tokenHash,
    sha256(adminCookie?.value ?? "")
  );

  const failure =
    await adminLogin.POST(
      postJson("/api/admin/login", {
        username: "adminuser",
        password: "wrong-password",
      })
    );

  assert.equal(failure.status, 401);

  assert.equal(state.adminSessionCreates, 1);

  /* Admin authentication never touches an OTP provider. */
  assert.equal(providerCalls.length, 0);
});

test("admin login keeps its failed-attempt rate limiting", async (t) => {
  reset();

  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    state.adminLoginAttempts.push({
      id: `aatt-${index}`,
      ipHash: sha256("unknown"),
      createdAt: new Date(),
    });
  }

  const { adminLogin } = await loadRoutes(t);

  const response = await adminLogin.POST(
    postJson("/api/admin/login", {
      username: "adminuser",
      password: "correct-password",
    })
  );

  assert.equal(response.status, 429);
});

test("delivery login still issues a session for correct credentials and none for wrong ones", async (t) => {
  reset();

  state.deliveryBoys.push({
    id: "dboy-1",
    username: "deliveryuser",
    passwordHash: bcrypt.hashSync(
      "correct-password",
      4
    ),
    isActive: true,
  });

  const providerCalls = installFetchMock(() =>
    jsonResponse({ success: true }, 200)
  );

  const { deliveryLogin } = await loadRoutes(t);

  const success =
    await deliveryLogin.POST(
      postJson("/api/delivery/login", {
        username: "deliveryuser",
        password: "correct-password",
      })
    );

  assert.equal(success.status, 200);

  const deliveryCookie =
    success.cookies.get("vegitptp-delivery");

  assert.ok(deliveryCookie);

  assert.equal(
    deliveryCookie?.httpOnly,
    true
  );

  assert.equal(
    state.deliverySessionCreates,
    1
  );

  const failure =
    await deliveryLogin.POST(
      postJson("/api/delivery/login", {
        username: "deliveryuser",
        password: "wrong-password",
      })
    );

  assert.equal(failure.status, 401);

  assert.equal(
    state.deliverySessionCreates,
    1
  );

  assert.equal(providerCalls.length, 0);
});

test("delivery login keeps its failed-attempt rate limiting", async (t) => {
  reset();

  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    state.deliveryLoginAttempts.push({
      id: `datt-${index}`,
      ipHash: sha256("unknown"),
      createdAt: new Date(),
    });
  }

  const { deliveryLogin } = await loadRoutes(t);

  const response =
    await deliveryLogin.POST(
      postJson("/api/delivery/login", {
        username: "deliveryuser",
        password: "correct-password",
      })
    );

  assert.equal(response.status, 429);
});
