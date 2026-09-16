// Browser helpers for the dev scripts: system Chrome, a settled study page, and the
// usual command-line handling.
const { parseArgs } = require("node:util");
const { chromium } = require("playwright");

const launch = () => chromium.launch({ channel: "chrome", headless: true });
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function openStudy(browser, origin, options) {
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

// Parses flags, printing usage for --help, and reports failures without a stack trace.
function command(usage, options, main) {
  let parsed;
  try {
    parsed = parseArgs({ options: { ...options, help: { type: "boolean", short: "h" } }, allowPositionals: true });
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    process.exitCode = 2;
    return;
  }
  if (parsed.values.help) return console.log(usage);
  main(parsed).catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { launch, settle, openStudy, command };
