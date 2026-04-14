#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_URL = "http://127.0.0.1:3001/";
const DEFAULT_LABEL = "nursing-station-signin";
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
        "  npm install",
        "  npm run playwright:install",
      ].join("\n"),
    );
    process.exit(1);
  }

  const url = process.argv[2] ?? DEFAULT_URL;
  const label = sanitize(process.argv[3] ?? DEFAULT_LABEL);
  const artifactDir = resolve(ARTIFACT_ROOT, label);
  mkdirSync(artifactDir, { recursive: true });

  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
  const headless = process.env.PLAYWRIGHT_HEADLESS !== "0";
  const browser = await playwright.chromium.launch({
    headless,
    ...(executablePath ? { executablePath } : {}),
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  const consoleMessages = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
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

  const requiredTexts = [
    "nursing station",
    "Current target",
  ];

  const bodyText = (await page.locator("body").textContent().catch(() => "")) ?? "";
  const missingTexts = requiredTexts.filter((text) => !bodyText.includes(text));

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
        currentUrl: page.url(),
        title: await page.title().catch(() => ""),
        consoleMessages,
        failedRequests,
        bodyPreview: bodyText.slice(0, 4000),
        missingTexts,
      },
      null,
      2,
    ),
  );

  if (missingTexts.length) {
    console.error(`Missing expected text: ${missingTexts.join(", ")}`);
    await context.close();
    await browser.close();
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        artifactDir,
        currentUrl: page.url(),
        headless,
        consoleErrorCount: consoleMessages.length,
        failedRequestCount: failedRequests.length,
      },
      null,
      2,
    ),
  );

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
