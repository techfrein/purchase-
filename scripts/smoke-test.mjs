/**
 * Smoke tests for purchase API + vendor-pricing rules.
 * Run: node scripts/smoke-test.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  failed++;
  console.error(`  ✗ ${name}`);
  if (detail) console.error(`    ${detail}`);
}

async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const cookie = res.headers.get("set-cookie") ?? "";
  const session = cookie.match(/hpv_session=([^;]+)/)?.[1];
  if (!res.ok || !session) {
    throw new Error(`Login failed for ${username}: ${res.status}`);
  }
  return session;
}

async function api(session, path, opts = {}) {
  const headers = { ...(opts.headers ?? {}), Cookie: `hpv_session=${session}` };
  if (opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function main() {
  console.log(`\nSmoke tests against ${BASE}\n`);

  // --- Unit-level checks (inline, no server needed for logic) ---
  console.log("Logic checks (imported at runtime via API behavior):");

  let staffSession;
  let purchaseSession;
  let adminSession;

  try {
    staffSession = await login("staff", "staff123");
    ok("staff login");
  } catch (e) {
    fail("staff login", e.message);
    process.exit(1);
  }

  try {
    purchaseSession = await login("purchase", "purchase123");
    ok("purchase login");
  } catch (e) {
    fail("purchase login", e.message);
  }

  try {
    adminSession = await login("admin", "admin123");
    ok("admin login");
  } catch (e) {
    fail("admin login", e.message);
  }

  // Staff: create without vendor price
  const staffNoPrice = await api(staffSession, "/api/purchases", {
    method: "POST",
    body: JSON.stringify({
      productName: `Smoke Test Staff No Price ${Date.now()}`,
      category: "Other",
      quantity: 2,
      notes: "staff smoke test",
    }),
  });
  if (staffNoPrice.res.status === 201 && staffNoPrice.json?.id) {
    ok("staff can create purchase without vendor price");
  } else {
    fail("staff can create purchase without vendor price", JSON.stringify(staffNoPrice.json));
  }

  // Staff: API tampering — unitPrice should be stripped
  const staffTamper = await api(staffSession, "/api/purchases", {
    method: "POST",
    body: JSON.stringify({
      productName: `Smoke Test Staff Tamper ${Date.now()}`,
      category: "Other",
      quantity: 1,
      unitPrice: 99999,
      vendorName: "Fake Vendor",
      vendorContact: "000",
      invoiceNo: "INV-FAKE",
    }),
  });
  if (staffTamper.res.status === 201 && staffTamper.json?.id) {
    const detail = await api(staffSession, `/api/purchases`, { method: "GET" });
    const row = detail.json?.purchases?.find((p) => p.id === staffTamper.json.id);
    if (row && row.unit_price == null && !row.vendor_name) {
      ok("staff vendor pricing stripped on API (tamper resistance)");
    } else {
      fail(
        "staff vendor pricing stripped on API",
        `unit_price=${row?.unit_price}, vendor=${row?.vendor_name}`
      );
    }
  } else {
    fail("staff tamper create", JSON.stringify(staffTamper.json));
  }

  if (purchaseSession) {
    // Purchase: create without price (optional)
    const purchaseNoPrice = await api(purchaseSession, "/api/purchases", {
      method: "POST",
      body: JSON.stringify({
        productName: `Smoke Test Purchase No Price ${Date.now()}`,
        category: "Other",
        quantity: 1,
      }),
    });
    if (purchaseNoPrice.res.status === 201) {
      ok("purchase dept can create without vendor price");
    } else {
      fail("purchase dept can create without vendor price", JSON.stringify(purchaseNoPrice.json));
    }

    // Purchase: create with price
    const purchaseWithPrice = await api(purchaseSession, "/api/purchases", {
      method: "POST",
      body: JSON.stringify({
        productName: `Smoke Test Purchase With Price ${Date.now()}`,
        category: "Other",
        quantity: 1,
        unitPrice: 1500,
        vendorName: "Test Vendor",
      }),
    });
    if (purchaseWithPrice.res.status === 201) {
      const detail = await api(purchaseSession, `/api/purchases`, { method: "GET" });
      const row = detail.json?.purchases?.find((p) => p.id === purchaseWithPrice.json.id);
      if (row && Number(row.unit_price) === 1500 && row.vendor_name === "Test Vendor") {
        ok("purchase dept can set optional vendor price");
      } else {
        fail("purchase dept vendor price saved", JSON.stringify(row));
      }
    } else {
      fail("purchase dept create with price", JSON.stringify(purchaseWithPrice.json));
    }
  }

  // Validation: empty product name rejected
  const bad = await api(staffSession, "/api/purchases", {
    method: "POST",
    body: JSON.stringify({ productName: "", category: "Other", quantity: 1 }),
  });
  if (bad.res.status === 400) {
    ok("validation rejects empty product name");
  } else {
    fail("validation rejects empty product name", `status ${bad.res.status}`);
  }

  // Dashboard reachable when logged in
  const dash = await api(staffSession, "/", { method: "GET" });
  if (dash.res.status === 200) {
    ok("staff can load dashboard");
  } else {
    fail("staff can load dashboard", `status ${dash.res.status}`);
  }

  if (adminSession) {
    const settings = await api(adminSession, "/api/settings", { method: "GET" });
    if (settings.res.status === 200 || settings.res.status === 405) {
      ok("admin session valid (settings route reachable)");
    } else {
      fail("admin session", `status ${settings.res.status}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e.message);
  process.exit(1);
});