/*
 * Static guards: these tests read the source tree and fail if a
 * future change reintroduces Message Central into customer OTP
 * flows, exposes the Wakit key to browser code, or logs secrets.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(
    join(ROOT, relativePath),
    "utf8"
  );
}

function listSourceFiles(
  directory: string
): string[] {
  const absolute = join(ROOT, directory);

  const found: string[] = [];

  for (const entry of readdirSync(absolute)) {
    const entryPath = join(absolute, entry);

    if (statSync(entryPath).isDirectory()) {
      found.push(
        ...listSourceFiles(
          join(directory, entry)
        )
      );

      continue;
    }

    if (/\.(ts|tsx)$/.test(entry)) {
      found.push(entryPath);
    }
  }

  return found;
}

function toRelative(absolute: string) {
  return relative(ROOT, absolute)
    .split(sep)
    .join("/");
}

const SEND_ROUTE =
  "src/app/api/auth/send-otp/route.ts";

const VERIFY_ROUTE =
  "src/app/api/auth/verify-otp/route.ts";

const WAKIT_CLIENT = "src/lib/wakit.ts";

test("customer OTP routes delegate provider calls to the Wakit client", () => {
  for (const file of [
    SEND_ROUTE,
    VERIFY_ROUTE,
  ]) {
    const source = read(file);

    assert.ok(
      !/fetch\(/.test(source),
      `${file} should delegate provider calls to src/lib/wakit.ts`
    );
  }
});

test("customer OTP routes use the Wakit client", () => {
  assert.match(
    read(SEND_ROUTE),
    /sendWakitOtp/
  );

  assert.match(
    read(VERIFY_ROUTE),
    /verifyWakitOtp/
  );
});

test("obsolete provider client is removed", () => {
  assert.equal(
    existsSync(join(ROOT, "src/lib/message-central.ts")),
    false
  );
});

test("the Wakit API key is only read from server-only code", () => {
  const files = listSourceFiles("src");

  const keyReaders = files
    .filter((file) =>
      /WAKIT_API_KEY/.test(readFileSync(file, "utf8"))
    )
    .map(toRelative);

  assert.deepEqual(keyReaders, [
    WAKIT_CLIENT,
  ]);

  for (const file of files) {
    const source = readFileSync(file, "utf8");

    assert.ok(
      !/NEXT_PUBLIC[A-Z_]*WAKIT/i.test(source),
      `${toRelative(
        file
      )} exposes a Wakit env var to the browser`
    );
  }
});

test("client components never contain Wakit credentials or endpoints", () => {
  const files = listSourceFiles("src");

  for (const file of files) {
    const source = readFileSync(file, "utf8");

    const isClientComponent =
      /^\s*["']use client["']/m.test(source);

    if (!isClientComponent) {
      continue;
    }

    assert.ok(
      !/WAKIT_API_KEY|wk_live_|wakit\.in/i.test(
        source
      ),
      `${toRelative(
        file
      )} is a client component that mentions Wakit internals`
    );
  }
});

test("server OTP code never logs the API key or an OTP code", () => {
  const files = [
    WAKIT_CLIENT,
    SEND_ROUTE,
    VERIFY_ROUTE,
  ];

  for (const file of files) {
    const lines = read(file).split(/\r?\n/);

    for (const line of lines) {
      if (!line.includes("console.")) {
        continue;
      }

      assert.ok(
        !/\$\{/.test(line),
        `${file} interpolates into a log statement: ${line.trim()}`
      );

      assert.ok(
        !/(apikey|api_key|authorization|bearer)/i.test(
          line
        ),
        `${file} logs a credential: ${line.trim()}`
      );

      assert.ok(
        !/\bcode\b/.test(line),
        `${file} logs the OTP code variable: ${line.trim()}`
      );
    }
  }
});
