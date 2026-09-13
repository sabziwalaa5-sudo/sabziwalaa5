/**
 * Headless walkthrough: storefront <-> admin/vendor/rider portals.
 * Usage: BASE_URL=http://127.0.0.1:3000 node --import tsx src/tests/e2e_admin_link.mjs
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = process.env.E2E_SHOT_DIR || "/tmp/sabji-screens";
fs.mkdirSync(OUT, { recursive: true });

const chrome =
  process.env.CHROME_PATH ||
  ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].find((p) =>
    fs.existsSync(p)
  );

if (!chrome) {
  console.error("Chrome not found");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  protocolTimeout: 20000,
  args: [
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-extensions",
    "--disable-default-apps",
    "--no-first-run",
    "--disable-component-update",
    "--mute-audio",
    "--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints",
  ],
});

const page = await browser.newPage();
page.setDefaultTimeout(15000);
await page.setViewport({ width: 1440, height: 900 });

async function shot(name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("shot", file);
}

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("SABJIWALAA"));
  await page.waitForSelector('[data-testid="staff-portal-links"]');
  await page.$eval('[data-testid="staff-portal-links"]', (el) => el.scrollIntoView({ block: "center" }));
  await shot("01_storefront_with_admin_links");

  const adminHref = await page.$eval('[data-testid="staff-portal-links"] a', (el) => el.getAttribute("href"));
  if (!adminHref || !adminHref.includes("admin")) {
    throw new Error(`Expected Admin href, got ${adminHref}`);
  }

  await page.click('[data-testid="staff-portal-links"] a');
  await page.waitForSelector('[data-testid="admin-gate"]');
  await shot("02_admin_web_gate");

  await page.goto(`${BASE}/vendor`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Merchant Sign In") || document.body.innerText.includes("Merchant Hub"));
  await shot("03_vendor_portal");

  await page.goto(`${BASE}/rider`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Agent Sign In") || document.body.innerText.includes("Rider Terminal"));
  await shot("04_rider_portal");

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="staff-portal-links"]');
  await page.evaluate(() => {
    localStorage.setItem(
      "sabjiwala_platform_settings",
      JSON.stringify({
        maintenanceMode: true,
        minOrderThreshold: 100,
        freeDeliveryThreshold: 200,
        rewardSettings: { enabled: true, earningRate: 5, pointValue: 1 },
      })
    );
    window.dispatchEvent(new Event("sabjiwala_state_update"));
  });
  await page.waitForFunction(() => document.body.innerText.includes("Storefront maintenance"));
  await shot("05_storefront_applies_admin_maintenance");

  console.log("E2E admin-link walkthrough passed");
} catch (err) {
  console.error("E2E failed:", err);
  await shot("zz_failure").catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
