#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:3001/?fixture=shell';
const DEFAULT_LABEL = 'nursing-station-shell';
const ARTIFACT_ROOT = resolve(process.cwd(), 'artifacts', 'playwright');

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error(
      [
        'Playwright is not installed.',
        'Run:',
        '  npm install',
        '  npm run playwright:install',
      ].join('\n'),
    );
    process.exit(1);
  }

  const url = process.argv[2] ?? DEFAULT_URL;
  const label = sanitize(process.argv[3] ?? DEFAULT_LABEL);
  const artifactDir = resolve(ARTIFACT_ROOT, label);
  mkdirSync(artifactDir, { recursive: true });

  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
  const headless = process.env.PLAYWRIGHT_HEADLESS !== '0';
  const browser = await playwright.chromium.launch({
    headless,
    ...(executablePath ? { executablePath } : {}),
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  const consoleMessages = [];
  const failedRequests = [];
  const assertions = [];

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    }
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? 'unknown',
    });
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  await expectVisible(page, '[data-testid="assignment-group-review"]', 'assignment board review group renders', assertions);
  await expectVisible(page, '[data-testid="assignment-task-task-shift-report"]', 'assignment board review task renders', assertions);
  await expectVisible(page, '[data-testid="assignment-patient-patient-123"]', 'assignment patient directory renders', assertions);

  await page.click('[data-testid="assignment-patient-patient-123"]');
  await page.waitForURL('**/Patient/patient-123/overview?fixture=shell');
  await expectVisible(page, '[data-testid="patient-header"]', 'patient header visible after assignment patient entry', assertions);
  await expectVisible(page, '[data-testid="chart-section-overview"]', 'overview section renders by default', assertions);
  await expectVisible(page, '[data-testid="overview-review-queue-row-task-shift-report"]', 'overview review queue renders draft task', assertions);
  await page.click('[data-testid="overview-review-queue-row-task-shift-report"]');
  await page.waitForURL('**/Patient/patient-123/tasks?*reviewTask=task-shift-report*');
  await expectVisible(page, '[data-testid="patient-review-detail-panel"]', 'overview queue opens patient review detail', assertions);
  await expectVisible(page, '[data-testid="patient-review-detail-draft-preview"]', 'draft preview is visible from overview queue entry', assertions);
  await expectVisible(page, '[data-testid="patient-task-queue-group-review-required"]', 'patient queue starts with review-required grouping', assertions);
  await expectVisible(page, '[data-testid="patient-review-detail-action-reviewed"]', 'review action button is visible', assertions);
  await page.click('[data-testid="patient-review-detail-action-reviewed"]');
  await expectText(page, '[data-testid="patient-review-detail-review-state"]', 'reviewed', 'review action updates review state', assertions);
  await expectText(page, '[data-testid="patient-task-queue-state-task-shift-report"]', 'Reviewed', 'queue badge reflects reviewed state', assertions);
  await expectVisible(page, '[data-testid="patient-review-detail-action-acknowledged"]', 'acknowledge action becomes visible', assertions);
  await page.click('[data-testid="patient-review-detail-action-acknowledged"]');
  await expectText(page, '[data-testid="patient-review-detail-review-state"]', 'acknowledged', 'acknowledge action updates review state', assertions);
  await expectVisible(page, '[data-testid="patient-task-queue-group-acknowledged"]', 'queue groups acknowledged work separately', assertions);
  await expectText(page, '[data-testid="patient-task-queue-state-task-shift-report"]', 'Acknowledged', 'queue badge reflects acknowledged state', assertions);
  await expectVisible(page, '[data-testid="patient-review-detail-action-approved"]', 'finalize action becomes visible', assertions);
  await page.click('[data-testid="patient-review-detail-action-approved"]');
  await expectText(page, '[data-testid="patient-review-detail-review-state"]', 'approved', 'finalize action updates review state', assertions);
  await expectText(page, '[data-testid="patient-review-detail-doc-status"]', 'final', 'finalize action updates draft status', assertions);
  await expectVisible(page, '[data-testid="patient-task-queue-group-finalized"]', 'queue groups finalized work separately', assertions);
  await expectText(page, '[data-testid="patient-task-queue-state-task-shift-report"]', 'Finalized', 'queue badge reflects finalized state', assertions);

  for (const section of ['timeline', 'vitals', 'labs', 'meds', 'tasks']) {
    await page.click(`[data-testid="chart-nav-${section}"]`);
    await page.waitForURL(`**/Patient/patient-123/${section}?fixture=shell`);
    await expectVisible(page, '[data-testid="patient-header"]', `patient header persists on ${section}`, assertions);
    await expectVisible(page, `[data-testid="chart-section-${section}"]`, `${section} section renders`, assertions);
  }

  await page.click('[data-testid="chart-nav-vitals"]');
  await page.waitForURL('**/Patient/patient-123/vitals?fixture=shell');
  await expectVisible(page, '[data-testid="vitals-delta-8867-4"]', 'vitals trend delta renders for heart rate', assertions);
  await expectVisible(page, '[data-testid="vitals-sparkline-8867-4"]', 'vitals sparkline renders for heart rate', assertions);

  await page.click('[data-testid="chart-nav-labs"]');
  await page.waitForURL('**/Patient/patient-123/labs?fixture=shell');
  await expectVisible(page, '[data-testid="results-review-group-needs-review"]', 'results review queue renders needs-review bucket', assertions);
  await expectVisible(page, '[data-testid="results-review-detail"]', 'results review detail renders', assertions);
  await expectVisible(page, '[data-testid="results-review-delta-lab-lactate"]', 'results trend delta renders for lactate', assertions);
  await expectVisible(page, '[data-testid="results-action-reviewed"]', 'results review action button is visible', assertions);
  await page.click('[data-testid="results-action-reviewed"]');
  await expectText(page, '[data-testid="results-review-detail-state"]', 'Reviewed', 'results review action updates state', assertions);
  await expectText(page, '[data-testid="results-review-state-lab-lactate"]', 'Reviewed', 'results queue badge reflects reviewed state', assertions);
  await expectVisible(page, '[data-testid="results-action-acknowledged"]', 'results acknowledge action becomes visible', assertions);
  await page.click('[data-testid="results-action-acknowledged"]');
  await expectText(page, '[data-testid="results-review-state-lab-lactate"]', 'Acknowledged', 'results queue badge reflects acknowledged state', assertions);

  await page.click('[data-testid="chart-nav-tasks"]');
  await page.waitForURL('**/Patient/patient-123/tasks?fixture=shell');
  await expectVisible(page, '[data-testid="patient-task-queue-row-task-shift-report"]', 'patient task queue renders draft-ready task', assertions);

  await page.click('[data-testid="app-nav-tasks"]');
  await page.waitForURL('**/Task?fixture=shell');
  await expectVisible(page, '[data-testid="task-review-queue-row-task-shift-report"]', 'app nav tasks preserves fixture mode', assertions);
  await expectVisible(page, '[data-testid="task-review-queue-row-task-shift-report"]', 'global task review queue renders draft-ready task', assertions);

  await page.click('[data-testid="app-nav-worklist"]');
  await page.waitForURL('**/?fixture=shell');
  await expectVisible(page, '[data-testid="assignment-task-task-shift-report"]', 'app nav worklist preserves fixture mode', assertions);

  await page.click('[data-testid="assignment-task-task-shift-report"]');
  await page.waitForURL('**/Patient/patient-123/tasks?*reviewTask=task-shift-report*');
  await expectVisible(page, '[data-testid="patient-review-detail-panel"]', 'assignment task entry opens patient review detail', assertions);

  await page.goto('http://127.0.0.1:3001/Task?fixture=shell', { waitUntil: 'networkidle', timeout: 30000 });
  await expectVisible(page, '[data-testid="task-review-queue-row-task-shift-report"]', 'fixture task list renders', assertions);
  await page.click('[data-testid="task-review-queue-row-task-shift-report"]');
  await page.waitForURL('**/Patient/patient-123/tasks?*reviewTask=task-shift-report*');
  await expectVisible(page, '[data-testid="patient-review-detail-panel"]', 'task click opens patient review detail', assertions);
  await expectVisible(page, '[data-testid="patient-review-detail-draft-preview"]', 'task click shows draft preview', assertions);

  await page.goto('http://127.0.0.1:3001/Patient/patient-123?fixture=shell', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForURL('**/Patient/patient-123/overview?fixture=shell');
  assertions.push('missing section redirects to overview');

  await page.goto('http://127.0.0.1:3001/Patient/patient-123/not-a-section?fixture=shell', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForURL('**/Patient/patient-123/overview?fixture=shell');
  assertions.push('invalid section redirects to overview');

  await page.screenshot({
    path: resolve(artifactDir, 'full-page.png'),
    fullPage: true,
  });

  writeFileSync(resolve(artifactDir, 'page.html'), await page.content());
  writeFileSync(
    resolve(artifactDir, 'report.json'),
    JSON.stringify(
      {
        url,
        currentUrl: page.url(),
        assertions,
        consoleMessages,
        failedRequests,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        artifactDir,
        currentUrl: page.url(),
        assertions,
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

async function expectVisible(page, selector, label, assertions) {
  await page.locator(selector).waitFor({ state: 'visible', timeout: 10000 });
  assertions.push(label);
}

async function expectText(page, selector, expected, label, assertions) {
  await page.locator(selector).waitFor({ state: 'visible', timeout: 10000 });
  const text = (await page.locator(selector).textContent())?.trim() ?? '';
  if (text !== expected) {
    throw new Error(`Expected ${selector} to equal "${expected}" but got "${text}"`);
  }
  assertions.push(label);
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
