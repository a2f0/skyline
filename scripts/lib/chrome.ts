// The system Google Chrome that the browser suites and the fidelity scripts drive through
// Playwright: its switches, a bounded launch, and a close that kills a Chrome that won't exit.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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

/**
 * Launching took 0.2-1 s, and once 7.6 s, with the host's load average at 5-80. Playwright kills a
 * Chrome that doesn't start in time.
 */
export const LAUNCH_TIMEOUT = 30_000;
/**
 * How long Chrome may take to close its contexts and exit before it is killed. Closing took
 * 0.06-0.1 s at load averages of 9-48, against 1.4-7 s without `UnexportableKeyDeletion`, and up to
 * about 5 s at 50-80, where a kill costs only a warning.
 */
const CLOSE_TIMEOUT = 5_000;
/** How long Chrome may take to exit once killed, which took well under a second. */
const KILL_TIMEOUT = 5_000;
/** How often to check whether a killed Chrome's profile and processes are gone. */
const POLL_INTERVAL = 20;
/** A hook that launches Chrome: the launch, and a margin for the rest. */
export const SETUP_TIMEOUT = LAUNCH_TIMEOUT + 5_000;
/** A hook that closes Chrome: its close, its kill if need be, and a margin for the rest. */
export const TEARDOWN_TIMEOUT = CLOSE_TIMEOUT + KILL_TIMEOUT + 5_000;

/** Each browser's launch tag, a switch only its browser process carries. */
const tags = new WeakMap<Browser, string>();

/** Launches Chrome headless, tagged so that `closeChrome` can find its process to kill. */
export async function launchChrome(options: LaunchOptions = {}): Promise<Browser> {
  const tag = `--skyline-chrome=${randomUUID()}`;
  const browser = await chromium.launch({
    channel: "chrome", headless: true, timeout: LAUNCH_TIMEOUT, ...options,
    args: [...(options.args ?? []), `--disable-features=${DISABLED_FEATURES.join(",")}`, tag],
  });
  tags.set(browser, tag);
  return browser;
}

/**
 * Chrome's browser process, which leads the process group of all its processes, and the profile
 * Playwright made for it, read from the command line that carries the browser's launch tag; none
 * once it has exited. Chrome passes its helpers only the switches they need, never the tag.
 */
export function chromeProcess(browser: Browser): { pid: number; profile: string | undefined } | undefined {
  const tag = tags.get(browser);
  if (!tag) return undefined;
  const listing = spawnSync("ps", ["-A", "-ww", "-o", "pid=,command="], { encoding: "utf8" }).stdout ?? "";
  const line = listing.split("\n").find((line) => line.includes(` ${tag}`) && !line.includes(" --type="));
  return line ? { pid: Number.parseInt(line, 10), profile: /--user-data-dir=(.+?)(?= --|$)/.exec(line)?.[1] } : undefined;
}

/**
 * Closes the contexts, then Chrome, as Playwright advises. If that takes longer than `budget`,
 * kills Chrome's processes, waits for Playwright to see it exit and remove its profile and for
 * the processes to be gone, and warns of the overrun rather than failing: the tests have finished
 * by then. Fails only when Chrome survives the kill. `alive` is how it checks a process group is
 * gone, which tests replace to make the exit late.
 */
export async function closeChrome(browser: Browser | undefined, budget = CLOSE_TIMEOUT, alive: (pid: number) => boolean = running): Promise<void> {
  if (!browser) return;
  const started = performance.now();
  const closing = (async () => {
    try { await Promise.all(browser.contexts().map((context) => context.close())); }
    finally { await browser.close(); }
  })();
  if (await settles(closing, budget)) return;
  const chrome = chromeProcess(browser);
  if (chrome) kill(chrome.pid);
  // Once Chrome is killed a context's close fails, and `closing` settles when Playwright sees the
  // exit. A browser close that starts after that returns without waiting for Playwright to remove
  // the profile, so the profile is waited for here. Playwright can also see the exit as soon as the
  // connection drops, before the process is reaped (a zombie still answers signal 0), so the
  // processes are waited for too; the timers let the runtime reap its child.
  const deadline = performance.now() + KILL_TIMEOUT, profile = chrome?.profile;
  const exited = (async () => {
    await closing.catch(() => undefined);
    while (profile && existsSync(profile) && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    while (chrome && alive(chrome.pid)) {
      if (performance.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    return true;
  })();
  if (!(await settles(exited, KILL_TIMEOUT)) || !(await exited)) {
    throw new Error(chrome ? `Chrome (pid ${chrome.pid}) didn't exit within ${KILL_TIMEOUT} ms of being killed` : `Chrome's process exited, but Playwright didn't finish closing it within ${budget + KILL_TIMEOUT} ms`);
  }
  const left = profile && existsSync(profile) ? `, leaving its profile ${profile}` : "";
  const after = chrome ? `so it was killed` : `though its process had exited`;
  console.warn(`Chrome${chrome ? ` (pid ${chrome.pid})` : ""} didn't close in ${budget} ms, ${after} (${Math.round(performance.now() - started)} ms)${left}`);
}

/** Whether `promise` resolves within `ms`; rethrows its rejection. */
async function settles(promise: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), ms); });
  try { return await Promise.race([promise.then(() => true), timeout]); }
  finally { clearTimeout(timer); }
}

/**
 * Whether Chrome's process group, or the process itself, still has a process, a zombie included:
 * one that hasn't been reaped yet still answers signal 0. Only `ESRCH` means there is none.
 */
export function running(pid: number): boolean {
  return exists(-pid) || exists(pid);
}

function exists(target: number): boolean {
  try { process.kill(target, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}

/** Kills Chrome's process group (Playwright starts Chrome as its leader), or else the process. */
function kill(pid: number): void {
  try { process.kill(-pid, "SIGKILL"); }
  catch {
    try { process.kill(pid, "SIGKILL"); }
    catch { /* It has already exited. */ }
  }
}
