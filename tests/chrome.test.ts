// The Chrome the browser suites and fidelity scripts share (scripts/lib/chrome.ts): its
// switches, and its teardown, whether Chrome closes or has to be killed.
import { describe, expect, spyOn, test } from "bun:test";
import { existsSync } from "node:fs";
import { browserProcess, chromeProfile, closeChrome, DISABLED_FEATURES, LAUNCH_TIMEOUT, launchChrome, PLAYWRIGHT_DISABLED_FEATURES, TEARDOWN_TIMEOUT } from "../scripts/lib/chrome.js";

const commandLine = (pid: number) => Bun.spawnSync(["ps", "-ww", "-o", "command=", "-p", String(pid)]).stdout.toString();
function running(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

describe("the shared Chrome", () => {
  test("disables the features Playwright does, and the key deletion, then closes without a trace", async () => {
    const browser = await launchChrome();
    const pid = await browserProcess(browser), command = commandLine(pid), directory = chromeProfile(pid);
    try {
      const lists = [...command.matchAll(/--disable-features=(\S+)/g)].map(([, list = ""]) => list.split(","));
      // Playwright's switch, then ours, the one Chrome reads.
      expect(lists).toEqual([PLAYWRIGHT_DISABLED_FEATURES, DISABLED_FEATURES]);
      expect(directory).toBeDefined();
      expect(existsSync(directory!)).toBe(true);
    } finally { await closeChrome(browser); }
    expect(running(pid)).toBe(false);
    expect(existsSync(directory!)).toBe(false);
  }, LAUNCH_TIMEOUT + TEARDOWN_TIMEOUT);

  test("kills a Chrome that doesn't close in its budget, says so, and leaves no profile", async () => {
    const browser = await launchChrome();
    const pid = await browserProcess(browser), directory = chromeProfile(pid);
    expect(directory).toBeDefined();
    const page = await browser.newPage();
    await page.goto("data:text/html,<p>hung</p>");
    // A stopped Chrome answers nothing, like a hung one.
    process.kill(pid, "SIGSTOP");
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await closeChrome(browser, 500);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("so it was killed");
    } finally { warn.mockRestore(); }
    expect(browser.isConnected()).toBe(false);
    expect(running(pid)).toBe(false);
    expect(existsSync(directory!)).toBe(false);
  }, LAUNCH_TIMEOUT + TEARDOWN_TIMEOUT);
});
