import assert from "node:assert/strict";
import http from "node:http";

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function sendBufferHttp(
  options: http.RequestOptions,
  payload: Buffer
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        ...options,
        headers: {
          ...options.headers,
          "Content-Length": String(payload.length),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: data }));
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log("\n=======================================================");
  console.log("  StatementHub v2 — Live HTTP API Integration Tests");
  console.log("=======================================================\n");

  // 1. Pages
  console.log("--- 1. Pages & Static Shell ---");
  await test("GET / returns HTTP 200 and loads application shell", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("<!DOCTYPE html>"), "Should return HTML document");
  });

  await test("GET /login returns HTTP 200 and loads login interface", async () => {
    const res = await fetch(`${BASE_URL}/login`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("<!DOCTYPE html>"), "Should return HTML document");
  });

  // 2. Auth State
  console.log("\n--- 2. Auth State & Status Check ---");
  await test("GET /api/auth/status returns protection and auth status", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.isAuthenticated, "boolean");
    assert.equal(typeof data.protectionEnabled, "boolean");
  });

  await test("POST /api/auth/verify handles input verification safely", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "test" }),
    });
    // In open-access mode (no APP_ACCESS_CODE configured), returns 200; in protected mode returns 401
    assert.ok(res.status === 200 || res.status === 401);
    const data = await res.json();
    assert.ok("success" in data);
  });

  // 3. Payload Size Guards (S7)
  console.log("\n--- 3. Payload Size Guards (S7) ---");
  await test("S7 Fix: POST /api/backup/import rejects oversized request (>25MB) with HTTP 413", async () => {
    // 26 MB buffer
    const largeBuffer = Buffer.alloc(26 * 1024 * 1024, 0x20);
    const res = await sendBufferHttp(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: "/api/backup/import",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      largeBuffer
    );
    assert.equal(res.status, 413, `Expected HTTP 413, received ${res.status}`);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes("too large"));
  });

  await test("S7 Fix: POST /api/parsers/pdf rejects oversized PDF upload (>15MB) with HTTP 413", async () => {
    // 16 MB buffer
    const largeBuffer = Buffer.alloc(16 * 1024 * 1024, 0x25); // %
    const res = await sendBufferHttp(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: "/api/parsers/pdf",
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
      },
      largeBuffer
    );
    assert.equal(res.status, 413, `Expected HTTP 413, received ${res.status}`);
    const data = JSON.parse(res.body);
    assert.ok(data.error.includes("too large"));
  });

  // 4. Gemini API & Bulk Endpoints (S2, P2)
  console.log("\n--- 4. Live API & Bulk Endpoints (S2, P2) ---");
  await test("S2 Fix: GET /api/ai/models uses live key and returns filtered models list", async () => {
    const res = await fetch(`${BASE_URL}/api/ai/models`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.models), "Should return array of models");
    assert.ok(data.models.length > 0, "Should have models loaded from Gemini API");
    const ids = data.models.map((m: any) => m.id);
    assert.ok(!ids.some((id: string) => id.includes("1.5")), "Should exclude legacy 1.5 models");
    assert.ok(!ids.some((id: string) => id.includes("2.0")), "Should exclude legacy 2.0 models");
    console.log(`    (Loaded ${data.models.length} live Gemini models; top model: ${ids[0]})`);
  });

  await test("P2 Fix: POST /api/transactions/party/bulk handles bulk party updates", async () => {
    const res = await fetch(`${BASE_URL}/api/transactions/party/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [
          { fingerprint: "fp_test_1", match_key: "TEST_VENDOR_1", party_name: "VENDOR ONE" },
          { fingerprint: "fp_test_2", match_key: "TEST_VENDOR_2", party_name: "VENDOR TWO" },
        ],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  await test("GET /api/cron/keep-alive pings database successfully", async () => {
    const res = await fetch(`${BASE_URL}/api/cron/keep-alive`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "active");
    console.log(`    (Database ping response: ${data.message})`);
  });

  console.log("\n=======================================================");
  console.log(`  Live HTTP Results: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
