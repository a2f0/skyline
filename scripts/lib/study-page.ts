// Browser helpers for the dev scripts: system Chrome, a settled study page, and the
// usual command-line handling.
import { chromium, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "playwright";
import { command } from "./command.js";

const launch = (): Promise<Browser> => chromium.launch({ channel: "chrome", headless: true });
const settle = (page: Page): Promise<void> => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

export async function openStudy(browser: Browser, origin: string, options: BrowserContextOptions): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/skyline-study.html`);
  await page.waitForFunction(() => (window as unknown as { __buildingStudy?: { ready?: boolean } }).__buildingStudy?.ready);
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await settle(page);
  return { context, page, errors };
}

export { launch, settle, command };
