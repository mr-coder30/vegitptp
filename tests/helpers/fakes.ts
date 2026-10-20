/*
 * Shared in-memory fakes for route-level tests.
 *
 * No database and no network are used: the Prisma client and
 * "next/headers" are replaced through node:test module mocking,
 * and every provider request is answered by a mocked fetch.
 * No real OTP is ever requested.
 */

import crypto from "crypto";

/* ------------------------------------------------------------------ *
 * Argument helpers (the fakes only interpret the query shapes that
 * the tested routes actually pass).
 * ------------------------------------------------------------------ */

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function asString(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function dateBounds(where: unknown): {
  gte: Date | null;
  lt: Date | null;
} {
  const createdAt = asRecord(where).createdAt;

  const bounds = asRecord(createdAt);

  return {
    gte:
      bounds.gte instanceof Date
        ? bounds.gte
        : null,
    lt:
      bounds.lt instanceof Date
        ? bounds.lt
        : null,
  };
}

/* ------------------------------------------------------------------ *
 * Rows
 * ------------------------------------------------------------------ */

export type OtpRequestRow = {
  id: string;
  phoneHash: string;
  ipHash: string | null;
  verificationId: string | null;
  createdAt: Date;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
  locality: string | null;
};

export type CustomerSessionRow = {
  id: string;
  customerId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type TokenSessionRow = {
  id: string;
  ownerId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type AttemptRow = {
  id: string;
  ipHash: string;
  createdAt: Date;
};

export type AdminRow = {
  id: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
};

export type DeliveryBoyRow = {
  id: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
};

export type FakeDbState = {
  otpRequests: OtpRequestRow[];
  customers: CustomerRow[];
  customerSessions: CustomerSessionRow[];
  adminSessions: TokenSessionRow[];
  deliverySessions: TokenSessionRow[];
  adminLoginAttempts: AttemptRow[];
  deliveryLoginAttempts: AttemptRow[];
  admins: AdminRow[];
  deliveryBoys: DeliveryBoyRow[];

  customerSessionCreates: number;
  adminSessionCreates: number;
  deliverySessionCreates: number;

  /* Number of upcoming customer.upsert calls that must fail with a
   * unique-constraint violation (simulates a registration race). */
  customerUpsertFailures: number;

  /*
   * "consume_fails" simulates a concurrent request winning the
   * race to consume the OTP: OtpRequest.deleteMany reports 0
   * deleted rows.
   */
  otpRequestConsumeMode:
    | "normal"
    | "consume_fails";
};

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

export function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

/* ------------------------------------------------------------------ *
 * Fake Prisma
 * ------------------------------------------------------------------ */

export function createFakePrisma() {
  const state: FakeDbState = {
    otpRequests: [],
    customers: [],
    customerSessions: [],
    adminSessions: [],
    deliverySessions: [],
    adminLoginAttempts: [],
    deliveryLoginAttempts: [],
    admins: [],
    deliveryBoys: [],
    customerSessionCreates: 0,
    adminSessionCreates: 0,
    deliverySessionCreates: 0,
    customerUpsertFailures: 0,
    otpRequestConsumeMode: "normal",
  };

  function removeIf<T>(
    rows: T[],
    predicate: (row: T) => boolean
  ): { count: number } {
    let count = 0;

    for (
      let index = rows.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (predicate(rows[index])) {
        rows.splice(index, 1);
        count += 1;
      }
    }

    return { count };
  }

  const otpRequest = {
    deleteMany: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      if (
        state.otpRequestConsumeMode ===
          "consume_fails" &&
        asString(asRecord(where).id)
      ) {
        return { count: 0 };
      }

      const id = asString(
        asRecord(where).id
      );

      if (id) {
        return removeIf(
          state.otpRequests,
          (row) => row.id === id
        );
      }

      const { lt } = dateBounds(where);

      if (lt) {
        return removeIf(
          state.otpRequests,
          (row) => row.createdAt < lt
        );
      }

      return { count: 0 };
    },

    findFirst: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const verificationId = asString(
        asRecord(where).verificationId
      );

      const phoneHash = asString(
        asRecord(where).phoneHash
      );

      const { gte } = dateBounds(where);

      const matches = state.otpRequests.filter(
        (row) => {
          if (
            verificationId !== undefined &&
            row.verificationId !==
              verificationId
          ) {
            return false;
          }

          if (
            phoneHash !== undefined &&
            row.phoneHash !== phoneHash
          ) {
            return false;
          }

          if (gte && row.createdAt < gte) {
            return false;
          }

          return true;
        }
      );

      if (matches.length === 0) {
        return null;
      }

      const orderBy = asRecord(
        asRecord(args).orderBy
      );

      const descending =
        orderBy.createdAt === "desc";

      const sorted = [...matches].sort(
        (a, b) =>
          descending
            ? b.createdAt.getTime() -
              a.createdAt.getTime()
            : a.createdAt.getTime() -
              b.createdAt.getTime()
      );

      return sorted[0];
    },

    count: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const phoneHash = asString(
        asRecord(where).phoneHash
      );

      const ipHash = asString(
        asRecord(where).ipHash
      );

      const { gte } = dateBounds(where);

      return state.otpRequests.filter(
        (row) => {
          if (
            phoneHash !== undefined &&
            row.phoneHash !== phoneHash
          ) {
            return false;
          }

          if (
            ipHash !== undefined &&
            row.ipHash !== ipHash
          ) {
            return false;
          }

          if (gte && row.createdAt < gte) {
            return false;
          }

          return true;
        }
      ).length;
    },

    create: async (args: unknown) => {
      const data = asRecord(asRecord(args).data);

      const row: OtpRequestRow = {
        id: nextId("otp"),
        phoneHash:
          asString(data.phoneHash) ?? "",
        ipHash:
          asString(data.ipHash) ?? null,
        verificationId:
          asString(data.verificationId) ??
          null,
        createdAt: new Date(),
      };

      state.otpRequests.push(row);

      return row;
    },
  };

  const customer = {
    upsert: async (args: unknown) => {
      if (
        state.customerUpsertFailures > 0
      ) {
        state.customerUpsertFailures -= 1;

        const error = new Error(
          "Unique constraint failed on phone."
        ) as Error & { code: string };

        error.code = "P2002";

        throw error;
      }

      const where = asRecord(asRecord(args).where);

      const phone =
        asString(where.phone) ?? "";

      const existing =
        state.customers.find(
          (row) => row.phone === phone
        );

      if (existing) {
        return existing;
      }

      const created: CustomerRow = {
        id: nextId("cust"),
        name: "",
        phone,
        address: "",
        landmark: null,
        locality: null,
      };

      state.customers.push(created);

      return created;
    },

    findUnique: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const phone =
        asString(where.phone) ?? "";

      return (
        state.customers.find(
          (row) => row.phone === phone
        ) ?? null
      );
    },
  };

  const customerSession = {
    deleteMany: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const customerId = asString(
        asRecord(where).customerId
      );

      const tokenHash = asString(
        asRecord(where).tokenHash
      );

      if (customerId) {
        return removeIf(
          state.customerSessions,
          (row) =>
            row.customerId === customerId
        );
      }

      if (tokenHash) {
        return removeIf(
          state.customerSessions,
          (row) =>
            row.tokenHash === tokenHash
        );
      }

      return { count: 0 };
    },

    create: async (args: unknown) => {
      state.customerSessionCreates += 1;

      const data = asRecord(asRecord(args).data);

      const row: CustomerSessionRow = {
        id: nextId("csess"),
        customerId:
          asString(data.customerId) ?? "",
        tokenHash:
          asString(data.tokenHash) ?? "",
        expiresAt:
          data.expiresAt instanceof Date
            ? data.expiresAt
            : new Date(),
      };

      state.customerSessions.push(row);

      return row;
    },
  };

  const admin = {
    findUnique: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const username =
        asString(where.username) ?? "";

      return (
        state.admins.find(
          (row) =>
            row.username === username
        ) ?? null
      );
    },
  };

  const adminSession = {
    deleteMany: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const adminId = asString(
        asRecord(where).adminId
      );

      if (adminId) {
        return removeIf(
          state.adminSessions,
          (row) =>
            row.ownerId === adminId
        );
      }

      return { count: 0 };
    },

    create: async (args: unknown) => {
      state.adminSessionCreates += 1;

      const data = asRecord(asRecord(args).data);

      const row: TokenSessionRow = {
        id: nextId("asess"),
        ownerId:
          asString(data.adminId) ?? "",
        tokenHash:
          asString(data.tokenHash) ?? "",
        expiresAt:
          data.expiresAt instanceof Date
            ? data.expiresAt
            : new Date(),
      };

      state.adminSessions.push(row);

      return row;
    },
  };

  const adminLoginAttempt = {
    deleteMany: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const id = asString(
        asRecord(where).id
      );

      if (id) {
        return removeIf(
          state.adminLoginAttempts,
          (row) => row.id === id
        );
      }

      const ipHash = asString(
        asRecord(where).ipHash
      );

      const { lt } = dateBounds(where);

      if (ipHash && lt) {
        return removeIf(
          state.adminLoginAttempts,
          (row) =>
            row.ipHash === ipHash &&
            row.createdAt < lt
        );
      }

      if (lt) {
        return removeIf(
          state.adminLoginAttempts,
          (row) => row.createdAt < lt
        );
      }

      return { count: 0 };
    },

    count: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const ipHash = asString(
        asRecord(where).ipHash
      );

      const { gte } = dateBounds(where);

      return state.adminLoginAttempts.filter(
        (row) => {
          if (
            ipHash !== undefined &&
            row.ipHash !== ipHash
          ) {
            return false;
          }

          if (gte && row.createdAt < gte) {
            return false;
          }

          return true;
        }
      ).length;
    },

    create: async (args: unknown) => {
      const data = asRecord(asRecord(args).data);

      const row: AttemptRow = {
        id: nextId("aatt"),
        ipHash:
          asString(data.ipHash) ?? "",
        createdAt: new Date(),
      };

      state.adminLoginAttempts.push(row);

      return row;
    },
  };

  const deliveryBoy = {
    findUnique: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const username =
        asString(where.username) ?? "";

      return (
        state.deliveryBoys.find(
          (row) =>
            row.username === username
        ) ?? null
      );
    },
  };

  const deliveryLoginAttempt = {
    deleteMany: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const id = asString(
        asRecord(where).id
      );

      if (id) {
        return removeIf(
          state.deliveryLoginAttempts,
          (row) => row.id === id
        );
      }

      const ipHash = asString(
        asRecord(where).ipHash
      );

      const { lt } = dateBounds(where);

      if (ipHash && lt) {
        return removeIf(
          state.deliveryLoginAttempts,
          (row) =>
            row.ipHash === ipHash &&
            row.createdAt < lt
        );
      }

      if (lt) {
        return removeIf(
          state.deliveryLoginAttempts,
          (row) => row.createdAt < lt
        );
      }

      return { count: 0 };
    },

    findFirst: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);
      const ipHash = asString(
        asRecord(where).ipHash
      );
      const { gte } = dateBounds(where);

      const oldestAttempt = state.deliveryLoginAttempts
        .filter((row) => {
          if (
            ipHash !== undefined &&
            row.ipHash !== ipHash
          ) {
            return false;
          }

          return !gte || row.createdAt >= gte;
        })
        .sort(
          (left, right) =>
            left.createdAt.getTime() -
            right.createdAt.getTime()
        )[0];

      return oldestAttempt
        ? { createdAt: oldestAttempt.createdAt }
        : null;
    },

    count: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const ipHash = asString(
        asRecord(where).ipHash
      );

      const { gte } = dateBounds(where);

      return state.deliveryLoginAttempts.filter(
        (row) => {
          if (
            ipHash !== undefined &&
            row.ipHash !== ipHash
          ) {
            return false;
          }

          if (gte && row.createdAt < gte) {
            return false;
          }

          return true;
        }
      ).length;
    },

    create: async (args: unknown) => {
      const data = asRecord(asRecord(args).data);

      const row: AttemptRow = {
        id: nextId("datt"),
        ipHash:
          asString(data.ipHash) ?? "",
        createdAt: new Date(),
      };

      state.deliveryLoginAttempts.push(
        row
      );

      return row;
    },
  };

  const deliverySession = {
    deleteMany: async (args: unknown) => {
      const where = asRecord(asRecord(args).where);

      const deliveryBoyId = asString(
        asRecord(where).deliveryBoyId
      );

      if (deliveryBoyId) {
        return removeIf(
          state.deliverySessions,
          (row) =>
            row.ownerId === deliveryBoyId
        );
      }

      return { count: 0 };
    },

    create: async (args: unknown) => {
      state.deliverySessionCreates += 1;

      const data = asRecord(asRecord(args).data);

      const row: TokenSessionRow = {
        id: nextId("dsess"),
        ownerId:
          asString(data.deliveryBoyId) ??
          "",
        tokenHash:
          asString(data.tokenHash) ?? "",
        expiresAt:
          data.expiresAt instanceof Date
            ? data.expiresAt
            : new Date(),
      };

      state.deliverySessions.push(row);

      return row;
    },
  };

  const prisma = {
    otpRequest,
    customer,
    customerSession,
    admin,
    adminSession,
    adminLoginAttempt,
    deliveryBoy,
    deliveryLoginAttempt,
    deliverySession,
    $transaction: async (
      fn: (tx: unknown) => Promise<unknown>
    ) => fn(prisma),
  };

  return { prisma, state };
}

/* ------------------------------------------------------------------ *
 * Cookie store (replaces next/headers cookies())
 * ------------------------------------------------------------------ */

export function createCookieStore() {
  const jar = new Map<string, string>();

  const setOptions = new Map<
    string,
    Record<string, unknown>
  >();

  const deletes: string[] = [];

  const store = {
    get: (name: string) =>
      jar.has(name)
        ? {
            value: jar.get(name) as string,
          }
        : undefined,

    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>
    ) => {
      jar.set(name, value);

      if (options) {
        setOptions.set(name, options);
      } else {
        setOptions.delete(name);
      }
    },

    delete: (name: string) => {
      jar.delete(name);
      setOptions.delete(name);
      deletes.push(name);
    },
  };

  return { jar, store, setOptions, deletes };
}

/* ------------------------------------------------------------------ *
 * Fetch mock
 * ------------------------------------------------------------------ */

export type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    }
  );
}

export function installFetchMock(
  handler: (
    call: FetchCall
  ) => Response | Promise<Response>
): FetchCall[] {
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    const rawHeaders = init?.headers;

    const call: FetchCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers:
        rawHeaders &&
        !(
          rawHeaders instanceof Headers
        )
          ? (rawHeaders as Record<
              string,
              string
            >)
          : {},
      body:
        typeof init?.body === "string"
          ? init.body
          : null,
    };

    calls.push(call);

    return handler(call);
  }) as typeof fetch;

  return calls;
}

/* ------------------------------------------------------------------ *
 * Console capture (leak assertions)
 * ------------------------------------------------------------------ */

export function captureConsole() {
  const entries: string[] = [];

  const original = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };

  const serialize = (
    args: unknown[]
  ): string =>
    args
      .map((argument) => {
        if (
          typeof argument === "string"
        ) {
          return argument;
        }

        try {
          return (
            JSON.stringify(argument) ??
            String(argument)
          );
        } catch {
          return String(argument);
        }
      })
      .join(" ");

  console.error = (...args: unknown[]) => {
    entries.push(serialize(args));
  };

  console.log = (...args: unknown[]) => {
    entries.push(serialize(args));
  };

  console.warn = (...args: unknown[]) => {
    entries.push(serialize(args));
  };

  return {
    entries,
    restore: () => {
      console.error = original.error;
      console.log = original.log;
      console.warn = original.warn;
    },
  };
}
