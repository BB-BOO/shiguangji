import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SCREENSHOTS = join(import.meta.dirname || ".", "screenshots");
mkdirSync(SCREENSHOTS, { recursive: true });

const ss = (name) => join(SCREENSHOTS, name);

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 14
  const page = await ctx.newPage();

  // ---- Login ----
  console.log("→ Login page");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', "test@example.com");
  await page.fill('input[type="password"]', "123456");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: ss("01-login.png"), fullPage: true });
  console.log("  screenshot: 01-login.png");

  // Login might redirect to /profile if no profile set
  const currentUrl = page.url();
  console.log(`  current url: ${currentUrl}`);

  // ---- Profile ----
  console.log("→ Profile page");
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click the "减脂" goal button to exercise goal mode selection
  try { await page.click('button:has-text("减脂")'); } catch (_) {}
  await page.waitForTimeout(300);

  // Fill profile fields
  const numInputs = page.locator('input[type="number"]');
  const numCount = await numInputs.count();
  if (numCount >= 3) {
    await numInputs.nth(0).fill("170");
    await numInputs.nth(1).fill("70");
    await numInputs.nth(2).fill("25");
  }
  await page.screenshot({ path: ss("02-profile.png"), fullPage: true });
  console.log("  screenshot: 02-profile.png");

  // Save profile
  try { await page.click('button:has-text("保存")'); await page.waitForTimeout(500); } catch (_) {}

  // ---- Home Page ----
  console.log("→ Home page (daily summary)");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ss("03-home.png"), fullPage: true });
  console.log("  screenshot: 03-home.png");

  // ---- Meal Page ----
  console.log("→ Meal page");
  await page.goto(`${BASE}/meal`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Select meal type
  try {
    await page.click('button:has-text("午餐")');
    console.log("  selected 午餐");
  } catch (e) {
    console.log("  meal type selector not found, continuing");
  }

  // Type and send food description
  try {
    const textarea = page.locator('textarea').first();
    await textarea.fill("中午吃了一碗牛肉面，加了个蛋");
    // Click send button (try multiple possible selectors)
    const sendBtn = page.locator('button[type="submit"], button:has-text("发送"), button:has(svg)').first();
    await sendBtn.click();
    console.log("  sent message, waiting for AI...");
    await page.waitForTimeout(5000); // wait for AI response
  } catch (e) {
    console.log(`  chat interaction: ${e.message}`);
  }

  await page.screenshot({ path: ss("04-meal.png"), fullPage: true });
  console.log("  screenshot: 04-meal.png");

  // ---- History Page ----
  console.log("→ History page");
  await page.goto(`${BASE}/history`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ss("05-history.png"), fullPage: true });
  console.log("  screenshot: 05-history.png");

  // ---- Weekly Page ----
  console.log("→ Weekly analysis page");
  await page.goto(`${BASE}/weekly`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ss("06-weekly.png"), fullPage: true });
  console.log("  screenshot: 06-weekly.png");

  // ---- Console errors ----
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  if (errors.length > 0) {
    console.log(`\n⚠ Console errors: ${errors.length}`);
    errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\n✓ No console errors");
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${SCREENSHOTS}`);
}

run().catch((err) => {
  console.error("Driver error:", err.message);
  process.exit(1);
});
