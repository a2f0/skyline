// The system Google Chrome that the browser suites and the fidelity scripts drive through
// Playwright: its switches, a bounded launch, and a close that kills a Chrome that won't exit.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium, type Browser, type LaunchOptions } from "playwright";

/**
 * The features Playwright 1.64 disables (playwright-core's `chromiumSwitches`). Chrome reads
 * only the last `--disable-features`, so ours repeats them; tests/chrome.test.ts fails when
 * Playwright's list changes.
 */
export const PLAYWRIGHT_DISABLED_FEATURES = [
  "AvoidUnnecessaryBeforeUnloadCheckSync", "DestroyProfileOnBrowserClose", "DialMediaRouteProvider",
  "GlobalMediaControls", "HttpsUpgrades", "LensOverlay", "MediaRouter", "PaintHolding",
  "ThirdPartyStoragePartitioning", "BlockOriginHeaderModificationOnRedirect",
  "AvoidCorsURLLoaderRestartOnRedirect", "Translate", "AutoDeElevate", "OptimizationHints",
  "NetworkTimeServiceQuerying", "AimEnabled", "msForceBrowserSignIn",
  "msEdgeUpdateLaunchServicesPreferredVersion",
];

/**
 * Chrome 156 on macOS deletes its Device Bound Session Credentials keys whenever an
 * off-the-record profile goes away, and every context is one, `browser.newPage()`'s too: a
 * keychain query through the Secure Enclave of about 5 s, one at a time, and Chrome won't exit
 * while one runs. These pages make no such keys.
 */
export const DISABLED_FEATURES = [...PLAYWRIGHT_DISABLED_FEATURES, "UnexportableKeyDeletion"];

/** Launching took 0.2-1 s, with the host's load average at 5-80. */
export const LAUNCH_TIMEOUT = 30_000;
/**
 * How long Chrome may take to close its contexts and exit before it is killed. Closing took
 * 0.06-0.1 s at load averages of 9-48, against 1.4-7 s without `UnexportableKeyDeletion`, and up to
 * about 5 s at 50-80, where a kill costs only a warning.
 */
const CLOSE_TIMEOUT = 5_000;
/** How long Chrome may take to exit once killed, which took well under a second. */
const KILL_TIMEOUT = 5_000;
/** A hook that only launches Chrome: the launch, and closing a Chrome it couldn't finish. */
export const SETUP_TIMEOUT = LAUNCH_TIMEOUT + CLOSE_TIMEOUT;
/** A hook that closes Chrome: its close, its kill if need be, and a margin for the rest. */
export const TEARDOWN_TIMEOUT = CLOSE_TIMEOUT + KILL_TIMEOUT + 5_000;

const processes = new WeakMap<Browser, number>();

/**
 * Launches Chrome headless and finds its process, to kill if it won't close, all within
 * `LAUNCH_TIMEOUT`. If finding the process fails, closes Chrome within its close budget before
 * rethrowing; a Chrome that ignores even that is left to Playwright, which kills the browsers it
 * launched when the process exits.
 */
export async function launchChrome(options: LaunchOptions = {}): Promise<Browser> {
  const started = performance.now();
  const browser = await chromium.launch({
    channel: "chrome", headless: true, timeout: LAUNCH_TIMEOUT, ...options,
    args: [...(options.args ?? []), `--disable-features=${DISABLED_FEATURES.join(",")}`],
  });
  const finding = browserProcess(browser);
  try {
    if (!(await settles(finding, Math.max(0, LAUNCH_TIMEOUT - (performance.now() - started))))) {
      throw new Error(`Chrome didn't report its process within ${LAUNCH_TIMEOUT} ms of launching`);
    }
    processes.set(browser, await finding);
  } catch (error) {
    await settles(browser.close(), CLOSE_TIMEOUT).catch(() => false);
    throw error;
  }
  return browser;
}

/** The browser process's id, which leads the process group of all Chrome's processes. */
export async function browserProcess(browser: Browser): Promise<number> {
  const session = await browser.newBrowserCDPSession();
  try {
    const { processInfo } = await session.send("SystemInfo.getProcessInfo");
    const pid = processInfo.find((info) => info.type === "browser")?.id;
    if (!pid) throw new Error("Chrome didn't report its browser process");
    return pid;
  } finally {
    await session.detach();
  }
}

/** The profile directory Playwright made for Chrome, read from its command line. */
export function chromeProfile(pid: number): string | undefined {
  const command = spawnSync("ps", ["-ww", "-o", "command=", "-p", String(pid)], { encoding: "utf8" }).stdout ?? "";
  return /--user-data-dir=(.+?)(?= --|$)/m.exec(command)?.[1];
}

/**
 * Closes the contexts, then Chrome, as Playwright advises. If that takes longer than `budget`,
 * kills Chrome's processes, waits for Playwright to see it exit and remove its profile, and
 * warns of the overrun rather than failing: the tests have finished by then. Fails only when
 * Chrome survives the kill.
 */
export async function closeChrome(browser: Browser | undefined, budget = CLOSE_TIMEOUT): Promise<void> {
  if (!browser) return;
  const started = performance.now();
  const closing = (async () => {
    try { await Promise.all(browser.contexts().map((context) => context.close())); }
    finally { await browser.close(); }
  })();
  if (await settles(closing, budget)) return;
  const pid = processes.get(browser);
  if (!pid) throw new Error(`Chrome didn't close in ${budget} ms, and its process is unknown`);
  const profile = chromeProfile(pid);
  kill(pid);
  // Once Chrome is killed a context's close fails, and `closing` settles when Playwright sees the
  // exit. A browser close that starts after that returns without waiting for Playwright to remove
  // the profile, so the profile is waited for here.
  const deadline = performance.now() + KILL_TIMEOUT;
  const exited = (async () => {
    await closing.catch(() => undefined);
    while (profile && existsSync(profile) && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  })();
  if (!(await settles(exited, KILL_TIMEOUT))) {
    throw new Error(`Chrome (pid ${pid}) didn't exit within ${KILL_TIMEOUT} ms of being killed`);
  }
  const left = profile && existsSync(profile) ? `, leaving its profile ${profile}` : "";
  console.warn(`Chrome (pid ${pid}) didn't close in ${budget} ms, so it was killed (${Math.round(performance.now() - started)} ms)${left}`);
}

/** Whether `promise` resolves within `ms`; rethrows its rejection. */
async function settles(promise: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), ms); });
  try { return await Promise.race([promise.then(() => true), timeout]); }
  finally { clearTimeout(timer); }
}

/** Kills Chrome's process group (Playwright starts Chrome as its leader), or else the process. */
function kill(pid: number): void {
  try { process.kill(-pid, "SIGKILL"); }
  catch {
    try { process.kill(pid, "SIGKILL"); }
    catch { /* It has already exited. */ }
  }
}
