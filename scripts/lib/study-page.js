// Browser helpers for the dev scripts: system Chrome, a settled study page, and the
// usual command-line handling.
import { chromium } from "playwright";
import { command } from "./command.js";

const launch = () => chromium.launch({ channel: "chrome", headless: true });
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

export async function openStudy(browser, origin, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/skyline-study.html`);
  await page.waitForFunction(() => window.__buildingStudy?.ready);
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await settle(page);
  return { context, page, errors };
}

export { launch, settle, command };
