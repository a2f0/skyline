// Browser helpers for the dev scripts: the shared system Chrome, a settled study page, and
// the usual command-line handling.
import type { Browser, BrowserContext, BrowserContextOptions, Page } from "playwright";
import { closeChrome, launchChrome } from "../../lib/chrome.js";
import { command } from "../../lib/command.js";

const launch = (): Promise<Browser> => launchChrome();
const settle = (page: Page): Promise<void> => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

export async function openStudy(browser: Browser, origin: string, options: BrowserContextOptions): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // The page opens on the geographic layout; the dev scripts measure and render the
  // original layout's fit.
  await page.goto(`${origin}/skyline-study.html?layout=original`);
  await page.waitForFunction(() => (window as unknown as { __buildingStudy?: { ready?: boolean } }).__buildingStudy?.ready);
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await settle(page);
  return { context, page, errors };
}

export { launch, closeChrome, settle, command };
