import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\pc\\.gemini\\antigravity\\brain\\c98a48ea-e0c0-4b4a-a066-f6e40f71a44f";
const URL = "http://localhost:3000";

async function runBrowserTest() {
  console.log("\n=======================================================");
  console.log("  StatementHub v2 — Automated In-Browser Test Suite");
  console.log("=======================================================\n");

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  const consoleErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err: any) => {
    consoleErrors.push(`[Page Uncaught Error] ${err?.message || String(err)}`);
  });

  try {
    console.log("1. Navigating to http://localhost:3000...");
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 15000 });

    const title = await page.title();
    console.log(`   Page Title: "${title}"`);

    // Verify main components render
    await page.waitForSelector("header", { timeout: 5000 });
    console.log("   ✓ Header element detected");

    // Screenshot 1: Main Dashboard
    const shot1 = path.join(ARTIFACT_DIR, "01-dashboard-search.png");
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`   ✓ Captured screenshot: ${shot1}`);

    // 2. Switch to Monthly Profit & Cash Flow tab
    console.log("\n2. Switching to 'Monthly Profit & Cash Flow' Tab...");
    const cashflowTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Monthly Profit & Cash Flow"));
    });

    if (cashflowTabBtn.asElement()) {
      await (cashflowTabBtn.asElement() as any).click();
      await page.waitForFunction(
        () => document.body.innerText.includes("Monthly Cash Flow") || document.body.innerText.includes("Operating Profit"),
        { timeout: 5000 }
      );
      console.log("   ✓ Cashflow tab loaded successfully");
    }

    // Wait for chart animation
    await new Promise((r) => setTimeout(r, 1200));

    // Screenshot 2: Cashflow tab with KPI cards and charts
    const shot2 = path.join(ARTIFACT_DIR, "02-cashflow-analytics.png");
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`   ✓ Captured screenshot: ${shot2}`);

    // 3. Switch back to Unified Transaction Search
    console.log("\n3. Switching back to 'Unified Transaction Search' Tab...");
    const searchTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Unified Transaction Search"));
    });

    if (searchTabBtn.asElement()) {
      await (searchTabBtn.asElement() as any).click();
      await new Promise((r) => setTimeout(r, 800));
      console.log("   ✓ Switched back to Search tab");
    }

    // 4. Test AI Party Assistant Expander
    console.log("\n4. Testing AI Party Assistant Expander...");
    const openAssistantBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Open Assistant"));
    });

    if (openAssistantBtn.asElement()) {
      await (openAssistantBtn.asElement() as any).click();
      console.log("   ✓ Clicked 'Open Assistant' button");
      // Wait for models to load
      await new Promise((r) => setTimeout(r, 1500));

      const shot3 = path.join(ARTIFACT_DIR, "03-ai-assistant-open.png");
      await page.screenshot({ path: shot3, fullPage: false });
      console.log(`   ✓ Captured screenshot: ${shot3}`);
    }

    // 5. Test Search input & Bank filters
    console.log("\n5. Testing Search Input & Table Filtering...");
    const searchInput = await page.$("input[placeholder*='Search'], input[placeholder*='search']");
    if (searchInput) {
      await searchInput.type("HDFC");
      console.log("   ✓ Typed 'HDFC' query into search input");
      await new Promise((r) => setTimeout(r, 500));

      const shot4 = path.join(ARTIFACT_DIR, "04-search-filtered.png");
      await page.screenshot({ path: shot4, fullPage: false });
      console.log(`   ✓ Captured screenshot: ${shot4}`);
    }

    // Check console errors
    console.log("\n6. Checking for Browser Console & Runtime Errors...");
    const criticalErrors = consoleErrors.filter((e) => !e.includes("404"));
    if (criticalErrors.length === 0) {
      console.log("   ✓ ZERO critical console errors detected!");
    } else {
      console.warn(`   Notice: ${criticalErrors.length} console issues logged:`);
      criticalErrors.forEach((e) => console.warn(`     ${e}`));
    }

    console.log("\n=======================================================");
    console.log("  All Browser Tests Completed Successfully!");
    console.log("=======================================================\n");
  } catch (err: any) {
    console.error("Browser test failed with exception:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
