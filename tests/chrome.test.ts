// The Chrome the browser suites and fidelity scripts share (scripts/lib/chrome.ts): its
// switches, and its teardown, whether Chrome closes or has to be killed.
import { describe, expect, spyOn, test } from "bun:test";
import { existsSync } from "node:fs";
import { chromeProcess, closeChrome, DISABLED_FEATURES, LAUNCH_TIMEOUT, launchChrome, PLAYWRIGHT_DISABLED_FEATURES, running, TEARDOWN_TIMEOUT } from "../scripts/lib/chrome.js";

/** Launches Chrome with a page, then stops it: a stopped Chrome answers nothing, like a hung one. */
async function hungChrome() {
  const browser = await launchChrome();
  const chrome = chromeProcess(browser)!;
  expect(chrome.profile).toBeDefined();
  const page = await browser.newPage();
  await page.goto("data:text/html,<p>hung</p>");
  process.kill(chrome.pid, "SIGSTOP");
  return { browser, chrome };
}

describe("the shared Chrome", () => {
  test("disables the features Playwright does, and the key deletion, then closes without a trace", async () => {
    const browser = await launchChrome();
    const chrome = chromeProcess(browser);
    try {
      // The launch tag finds the process Chrome itself reports as its browser.
      const session = await browser.newBrowserCDPSession();
      const { processInfo } = await session.send("SystemInfo.getProcessInfo");
      await session.detach();
      expect(chrome?.pid).toBe(processInfo.find((info) => info.type === "browser")!.id);
      const command = Bun.spawnSync(["ps", "-ww", "-o", "command=", "-p", String(chrome!.pid)]).stdout.toString();
      const lists = [...command.matchAll(/--disable-features=(\S+)/g)].map(([, list = ""]) => list.split(","));
      // Playwright's switch, then ours, the one Chrome reads.
      expect(lists).toEqual([PLAYWRIGHT_DISABLED_FEATURES, DISABLED_FEATURES]);
      expect(existsSync(chrome!.profile!)).toBe(true);
    } finally { await closeChrome(browser); }
    expect(running(chrome!.pid)).toBe(false);
    expect(existsSync(chrome!.profile!)).toBe(false);
    expect(chromeProcess(browser)).toBeUndefined();
  }, LAUNCH_TIMEOUT + TEARDOWN_TIMEOUT);

  test("kills a Chrome that doesn't close in its budget, says so, and leaves no profile", async () => {
    const { browser, chrome } = await hungChrome();
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    // Playwright can see the exit before the killed process is reaped; report it alive at the
    // first check so the close has to wait for it to go.
    const checks: boolean[] = [];
    const alive = (pid: number) => {
      const answer = checks.length === 0 || running(pid);
      checks.push(answer);
      return answer;
    };
    try {
      await closeChrome(browser, 500, alive);
      expect(checks[0]).toBe(true);
      expect(checks.at(-1)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("so it was killed");
    } finally { warn.mockRestore(); }
    expect(browser.isConnected()).toBe(false);
    expect(running(chrome.pid)).toBe(false);
    expect(existsSync(chrome.profile!)).toBe(false);
  }, LAUNCH_TIMEOUT + TEARDOWN_TIMEOUT);

  test("fails when a killed Chrome's processes outlast the kill budget", async () => {
    const { browser, chrome } = await hungChrome();
    try {
      await expect(closeChrome(browser, 500, () => true)).rejects.toThrow(`Chrome (pid ${chrome.pid}) didn't exit within`);
    } finally { await closeChrome(browser); }
    expect(running(chrome.pid)).toBe(false);
  }, LAUNCH_TIMEOUT + 2 * TEARDOWN_TIMEOUT);
});
