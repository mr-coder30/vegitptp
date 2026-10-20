/*
 * Unit tests for the server-only Wakit client.
 *
 * Every provider request is mocked: no live OTP is sent and no
 * Wakit credit is consumed. The API key used here is a dummy
 * value and assertions verify it never leaks into results.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatWakitRecipient,
  getWakitOtpStatus,
  isWakitConfigured,
  sendWakitOtp,
  verifyWakitOtp,
} from "@/lib/wakit";

import {
  installFetchMock,
  jsonResponse,
  type FetchCall,
} from "./helpers/fakes";

const TEST_API_KEY =
  "wk_live_unit_test_key_never_leak";

function withApiKey<T>(
  fn: () => Promise<T>
): Promise<T> {
  process.env.WAKIT_API_KEY =
    TEST_API_KEY;

  return fn();
}

function withoutApiKey<T>(
  fn: () => Promise<T>
): Promise<T> {
  delete process.env.WAKIT_API_KEY;

  return fn().finally(() => {
    process.env.WAKIT_API_KEY =
      TEST_API_KEY;
  });
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

test("sendOtp posts the documented payload with bearer auth", async () => {
  await withApiKey(async () => {
    const calls = installFetchMock(() =>
      jsonResponse(SEND_SUCCESS_BODY, 201)
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(calls.length, 1);

    const call = calls[0];

    assert.equal(
      call.url,
      "https://wakit.in/api/v1/otp/send"
    );

    assert.equal(call.method, "POST");

    assert.equal(
      call.headers.Authorization,
      `Bearer ${TEST_API_KEY}`
    );

    assert.deepEqual(
      JSON.parse(call.body ?? "null"),
      { to: "+919876543210" }
    );

    assert.equal(result.ok, true);

    if (result.ok) {
      assert.equal(
        result.id,
        SEND_SUCCESS_BODY.data.id
      );

      assert.equal(
        result.expiresAt,
        SEND_SUCCESS_BODY.data.expires_at
      );
    }
  });
});

test("sendOtp never includes the API key in the result", async () => {
  await withApiKey(async () => {
    installFetchMock(() =>
      jsonResponse(SEND_SUCCESS_BODY, 201)
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    const serialized = JSON.stringify(
      result
    );

    assert.ok(
      !serialized.includes(TEST_API_KEY)
    );

    assert.ok(
      !serialized.includes("Bearer")
    );
  });
});

test("sendOtp rejects an unformattable phone without a network call", async () => {
  await withApiKey(async () => {
    const calls = installFetchMock(() =>
      jsonResponse(SEND_SUCCESS_BODY, 201)
    );

    const result = await sendWakitOtp(
      "12345"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "rejected");
    }

    assert.equal(calls.length, 0);
  });
});

test("sendOtp reports not_configured when the key is missing and makes no request", async () => {
  const calls = installFetchMock(() =>
    jsonResponse(SEND_SUCCESS_BODY, 201)
  );

  const configured = isWakitConfigured();

  await withoutApiKey(async () => {
    assert.equal(
      isWakitConfigured(),
      false
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.kind,
        "not_configured"
      );
    }
  });

  assert.equal(calls.length, 0);

  /* The suite runs with a key configured. */
  assert.equal(configured, true);
});

test("sendOtp classifies a timeout", async () => {
  await withApiKey(async () => {
    installFetchMock(() => {
      const error = new Error(
        "The operation was aborted due to timeout"
      );

      error.name = "TimeoutError";

      throw error;
    });

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "timeout");
    }
  });
});

test("sendOtp classifies a network failure", async () => {
  await withApiKey(async () => {
    installFetchMock(() => {
      throw new TypeError(
        "fetch failed"
      );
    });

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "network");
    }
  });
});

test("sendOtp classifies a malformed success body", async () => {
  await withApiKey(async () => {
    installFetchMock(
      () =>
        new Response("<<<not json>>>", {
          status: 201,
        })
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "malformed");
    }
  });
});

test("sendOtp classifies an empty success body", async () => {
  await withApiKey(async () => {
    installFetchMock(
      () => new Response("", { status: 201 })
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "malformed");
    }
  });
});

test("sendOtp classifies an unexpected success shape", async () => {
  await withApiKey(async () => {
    installFetchMock(() =>
      jsonResponse(
        { success: true, data: {} },
        201
      )
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "malformed");
    }
  });
});

test("sendOtp maps provider HTTP errors by status", async () => {
  const cases: Array<{
    status: number;
    kind: string;
  }> = [
    { status: 401, kind: "auth" },
    { status: 403, kind: "auth" },
    { status: 402, kind: "balance" },
    { status: 422, kind: "rejected" },
    { status: 502, kind: "rejected" },
    { status: 500, kind: "provider" },
    { status: 503, kind: "provider" },
  ];

  await withApiKey(async () => {
    for (const scenario of cases) {
      installFetchMock(() =>
        jsonResponse(
          {
            success: false,
            type: "authentication_error",
          },
          scenario.status
        )
      );

      const result = await sendWakitOtp(
        "9876543210"
      );

      assert.equal(result.ok, false);

      if (!result.ok) {
        assert.equal(
          result.kind,
          scenario.kind,
          `status ${scenario.status}`
        );

        assert.equal(
          result.httpStatus,
          scenario.status
        );
      }
    }
  });
});

test("sendOtp surfaces provider rate limiting with Retry-After", async () => {
  await withApiKey(async () => {
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
              "retry-after": "17",
            },
          }
        )
    );

    const result = await sendWakitOtp(
      "9876543210"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.kind,
        "rate_limited"
      );

      assert.equal(
        result.retryAfterSeconds,
        17
      );
    }
  });
});

test("verifyOtp posts id and code and reports a successful match", async () => {
  await withApiKey(async () => {
    const calls = installFetchMock(() =>
      jsonResponse(VERIFY_SUCCESS_BODY, 200)
    );

    const result = await verifyWakitOtp(
      "019f6da2-e20f-717f-8c21-76f93f58992e",
      "123456"
    );

    assert.equal(result.ok, true);

    assert.equal(calls.length, 1);

    assert.equal(
      calls[0].url,
      "https://wakit.in/api/v1/otp/verify"
    );

    assert.deepEqual(
      JSON.parse(calls[0].body ?? "null"),
      {
        id: "019f6da2-e20f-717f-8c21-76f93f58992e",
        code: "123456",
      }
    );

    assert.equal(
      calls[0].headers.Authorization,
      `Bearer ${TEST_API_KEY}`
    );
  });
});

test("verifyOtp treats an unconfirmed code as incorrect without leaking it", async () => {
  await withApiKey(async () => {
    installFetchMock(() =>
      jsonResponse(
        {
          success: true,
          data: {
            verified: false,
            status: "sent",
          },
        },
        200
      )
    );

    const result = await verifyWakitOtp(
      "019f6da2-e20f-717f-8c21-76f93f58992e",
      "000000"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "incorrect");
    }

    const serialized = JSON.stringify(
      result
    );

    assert.ok(!serialized.includes("000000"));

    assert.ok(
      !serialized.includes(TEST_API_KEY)
    );
  });
});

test("verifyOtp rejects a malformed code before any request", async () => {
  await withApiKey(async () => {
    const calls = installFetchMock(() =>
      jsonResponse(VERIFY_SUCCESS_BODY, 200)
    );

    const result = await verifyWakitOtp(
      "019f6da2-e20f-717f-8c21-76f93f58992e",
      "12"
    );

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.kind, "rejected");
    }

    assert.equal(calls.length, 0);
  });
});

test("verifyOtp maps provider errors, including 502 as a transient provider failure", async () => {
  const cases: Array<{
    status: number;
    kind: string;
  }> = [
    { status: 404, kind: "not_found" },
    { status: 422, kind: "rejected" },
    { status: 429, kind: "rate_limited" },
    { status: 500, kind: "provider" },
    { status: 502, kind: "provider" },
  ];

  await withApiKey(async () => {
    for (const scenario of cases) {
      installFetchMock(() =>
        jsonResponse(
          { success: false },
          scenario.status
        )
      );

      const result = await verifyWakitOtp(
        "019f6da2-e20f-717f-8c21-76f93f58992e",
        "123456"
      );

      assert.equal(result.ok, false);

      if (!result.ok) {
        assert.equal(
          result.kind,
          scenario.kind,
          `status ${scenario.status}`
        );
      }
    }
  });
});

test("verifyOtp classifies a timeout and a malformed body", async () => {
  await withApiKey(async () => {
    installFetchMock(() => {
      const error = new Error("timed out");

      error.name = "TimeoutError";

      throw error;
    });

    const timeoutResult =
      await verifyWakitOtp(
        "019f6da2-e20f-717f-8c21-76f93f58992e",
        "123456"
      );

    assert.equal(timeoutResult.ok, false);

    if (!timeoutResult.ok) {
      assert.equal(
        timeoutResult.kind,
        "timeout"
      );
    }

    installFetchMock(
      () => new Response("nope", { status: 200 })
    );

    const malformedResult =
      await verifyWakitOtp(
        "019f6da2-e20f-717f-8c21-76f93f58992e",
        "123456"
      );

    assert.equal(malformedResult.ok, false);

    if (!malformedResult.ok) {
      assert.equal(
        malformedResult.kind,
        "malformed"
      );
    }
  });
});

test("getOtpStatus reads the documented status field and tolerates failures", async () => {
  await withApiKey(async () => {
    const calls: FetchCall[] =
      installFetchMock(() =>
        jsonResponse(
          {
            success: true,
            data: { status: "verified" },
          },
          200
        )
      );

    assert.equal(
      await getWakitOtpStatus("abc"),
      "verified"
    );

    assert.equal(
      calls[0].url,
      "https://wakit.in/api/v1/otp/abc"
    );

    installFetchMock(() =>
      jsonResponse({ success: false }, 404)
    );

    assert.equal(
      await getWakitOtpStatus("abc"),
      null
    );

    installFetchMock(
      () => new Response("oops", { status: 200 })
    );

    assert.equal(
      await getWakitOtpStatus("abc"),
      null
    );
  });
});

test("getOtpStatus does not call the provider without a key", async () => {
  const calls = installFetchMock(() =>
    jsonResponse({ success: true }, 200)
  );

  await withoutApiKey(async () => {
    assert.equal(
      await getWakitOtpStatus("abc"),
      null
    );
  });

  assert.equal(calls.length, 0);
});

test("formatWakitRecipient normalises only valid Indian mobiles", () => {
  assert.equal(
    formatWakitRecipient("9876543210"),
    "+919876543210"
  );

  assert.equal(
    formatWakitRecipient("1234567890"),
    null
  );

  assert.equal(
    formatWakitRecipient("+919876543210"),
    null
  );

  assert.equal(
    formatWakitRecipient(""),
    null
  );
});
