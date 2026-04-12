#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_URL = "http://10.0.0.184:3000/signin";
const DEFAULT_LABEL = "browser-smoke";
const ARTIFACT_ROOT = resolve(process.cwd(), "artifacts", "playwright");

async function main() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    console.error(
      [
        "Playwright is not installed.",
        "Run:",
        "  npm install -D playwright",
        "  npx playwright install",
      ].join("\n"),
    );
    process.exit(1);
  }

  const url = process.argv[2] ?? DEFAULT_URL;
  const label = sanitize(process.argv[3] ?? DEFAULT_LABEL);
  const artifactDir = resolve(ARTIFACT_ROOT, label);
  mkdirSync(artifactDir, { recursive: true });

  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
  const headless = process.env.PLAYWRIGHT_HEADLESS === "1";
  const browserType = playwright.chromium;
  const browser = await browserType.launch({
    headless,
    ...(executablePath ? { executablePath } : {}),
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    }
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    consoleMessages.push({
      type: "error",
      text: `goto failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const title = await page.title().catch(() => "");
  const currentUrl = page.url();
  const bodyText = (await page.locator("body").textContent().catch(() => "")) ?? "";

  await page.screenshot({
    path: resolve(artifactDir, "full-page.png"),
    fullPage: true,
  });

  writeFileSync(resolve(artifactDir, "page.html"), await page.content());
  writeFileSync(
    resolve(artifactDir, "report.json"),
    JSON.stringify(
      {
        url,
        currentUrl,
        title,
        consoleMessages,
        failedRequests,
        bodyPreview: bodyText.slice(0, 2000),
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        artifactDir,
        currentUrl,
        title,
        headless,
        consoleErrorCount: consoleMessages.length,
        failedRequestCount: failedRequests.length,
      },
      null,
      2,
    ),
  );

  if (process.env.PLAYWRIGHT_KEEP_OPEN === "1") {
    console.log("PLAYWRIGHT_KEEP_OPEN=1 set; leaving browser open.");
    return;
  }

  await context.close();
  await browser.close();
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
