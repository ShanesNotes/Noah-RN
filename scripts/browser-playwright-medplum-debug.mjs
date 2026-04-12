#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_URL = "http://10.0.0.184:3000/signin";
const ARTIFACT_ROOT = resolve(process.cwd(), "artifacts", "playwright", "medplum-debug");

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
  const label = sanitize(process.argv[3] ?? timestamp());
  const artifactDir = resolve(ARTIFACT_ROOT, label);
  mkdirSync(artifactDir, { recursive: true });

  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
  const headless = process.env.PLAYWRIGHT_HEADLESS === "1";

  if (!headless && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    console.error(
      [
        "No DISPLAY or WAYLAND_DISPLAY detected for headed Playwright.",
        "Use:",
        "  PLAYWRIGHT_HEADLESS=1 npm run playwright:medplum:debug",
      ].join("\n"),
    );
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({
    headless,
    ...(executablePath ? { executablePath } : {}),
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const failedRequests = [];
  const responses = [];

  page.on("console", (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });

  page.on("response", async (response) => {
    const status = response.status();
    if (status >= 400) {
      responses.push({
        status,
        url: response.url(),
        method: response.request().method(),
      });
    }
  });

  let gotoError = null;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    gotoError = error instanceof Error ? error.message : String(error);
  }

  const title = await page.title().catch(() => "");
  const currentUrl = page.url();
  const bodyText = (await page.locator("body").textContent().catch(() => "")) ?? "";

  const storageState = await context.storageState();
  const cookies = storageState.cookies;

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
        gotoError,
        headless,
        consoleMessages,
        failedRequests,
        errorResponses: responses,
        cookieCount: cookies.length,
        bodyPreview: bodyText.slice(0, 4000),
      },
      null,
      2,
    ),
  );

  writeFileSync(
    resolve(artifactDir, "report.txt"),
    [
      `URL: ${url}`,
      `Current URL: ${currentUrl}`,
      `Title: ${title}`,
      `Headless: ${headless}`,
      `Goto Error: ${gotoError ?? "none"}`,
      `Cookies: ${cookies.length}`,
      "",
      "Console:",
      ...consoleMessages.map((m) => `- [${m.type}] ${m.text}`),
      "",
      "Failed Requests:",
      ...failedRequests.map((r) => `- ${r.method} ${r.url} :: ${r.failure}`),
      "",
      "HTTP Error Responses:",
      ...responses.map((r) => `- ${r.method} ${r.url} :: ${r.status}`),
      "",
      "Body Preview:",
      bodyText.slice(0, 4000),
    ].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        artifactDir,
        currentUrl,
        title,
        gotoError,
        headless,
        consoleMessageCount: consoleMessages.length,
        failedRequestCount: failedRequests.length,
        errorResponseCount: responses.length,
        cookieCount: cookies.length,
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

function timestamp() {
  return new Date().toISOString().replace(/[:]/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
