// Checks that a deployed origin serves exactly what the build published.
//
// The site is compiled and copied at deploy time, so a served file must be byte for byte the
// file a fresh local build produces. Comparing hashes rather than status codes is what makes
// this worth running: a 200 proves only that something answered, and a stale or empty file
// reads identically to a correct one.
//
// Three things are easy to get wrong, and all three are handled rather than documented away:
//
//   * `wrangler deploy` succeeding is not the edge serving the files. Assets can 404 for seconds
//     afterwards, so published files are retried before they count as missing.
//   * Cloudflare answers an `.html` request with a 307 to the extensionless path, so published
//     requests follow redirects. Forbidden ones must not: a redirect is not proof of absence, and
//     following one can land on a page that answers 200.
//   * A request that never resolves proves nothing, so it is a failure and never a quiet pass. That
//     matters most for the forbidden set, the only check here guarding a security property.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { buildSite, dist, publishedFiles, root } from "./build-site.js";
import { command } from "./lib/command.js";

const usage = `Usage: bun scripts/verify-deploy.ts [--url origin] [--attempts n] [--delay ms] [--timeout ms] [--deadline ms]
  Checks that every file scripts/build-site.ts publishes is served byte for byte against a fresh
  local build, and that nothing else in the repository is reachable at all. Published files are
  retried, because Cloudflare's edge can lag a successful wrangler upload by a few seconds.
  --url defaults to https://skyline.devopsrockstars.com.`;

const sha = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");

// A path is not a URL. Left raw, everything from a "#" or "?" onward is dropped before the request
// leaves, so "docs/notes#1.md" probes /docs/notes, which 404s and reads as proof that a file nobody
// asked about is absent. Each segment is encoded; "/" separates them and must survive.
export const urlFor = (origin: string, entry: string) => `${origin}/${entry.split("/").map(encodeURIComponent).join("/")}`;

async function walk(directory: string, prefix: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const next = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await walk(path.join(directory, entry.name), next));
    else found.push(next);
  }
  return found;
}

// Everything the repository holds that the build does not publish, derived rather than listed.
// A hand-kept list is a sample, and a sample cannot prove absence. `.secrets/` is gitignored, so it
// never appears in `git ls-files` and needs its own walk; it is also the directory whose exposure
// would matter most.
// git quotes any path outside plain ASCII ("docs/caf\303\251.md"), and a quoted literal probes a
// URL that is not the file, which then reads as proven absent. -z emits raw bytes instead.
export const parseTracked = (stdout: string) => stdout.split("\0").map((entry) => entry.trim()).filter(Boolean);

export async function forbiddenPaths(published: string[], deps: { tracked?: string[]; secrets?: string[] } = {}) {
  const listed = deps.tracked
    || parseTracked((await promisify(execFile)("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 1 << 24 })).stdout);
  const secrets = deps.secrets || await walk(path.join(root, ".secrets"), ".secrets");
  const publishedSet = new Set(published);
  return [...new Set([...listed, ...secrets])].map((entry) => entry.trim()).filter(Boolean)
    .filter((entry) => !publishedSet.has(entry)).sort();
}

export interface RequestAnswer {
  resolved: boolean;
  status: number;
  body: Buffer;
  error?: string;
}

// A request either answers or it does not; `resolved: false` is never treated as an answer.
export async function request(url: string, { redirect, timeout }: { redirect: RequestRedirect; timeout: number }): Promise<RequestAnswer> {
  try {
    const response = await fetch(url, { redirect, signal: AbortSignal.timeout(timeout) });
    return { resolved: true, status: response.status, body: Buffer.from(await response.arrayBuffer()) };
  } catch (error) {
    return { resolved: false, status: 0, body: Buffer.alloc(0), error: error instanceof Error ? error.message : String(error) };
  }
}

// Retries until `settled` accepts the answer, so a lagging edge reads as slow rather than broken.
// An unresolved request never settles: it exhausts its attempts and reports what went wrong.
async function attempt(send: (url: string, options: { redirect: RequestRedirect; timeout: number }) => Promise<RequestAnswer>,
  url: string, options: { redirect: RequestRedirect; timeout: number }, settled: (answer: RequestAnswer) => boolean, attempts: number, delay: number) {
  let last: RequestAnswer | undefined;
  for (let n = 1; n <= attempts; n += 1) {
    last = await send(url, options);
    if (last.resolved && settled(last)) return { ...last, attempts: n };
    if (n < attempts) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return { ...last!, attempts };
}

export interface VerifyDeps {
  request?: (url: string, options: { redirect: RequestRedirect; timeout: number }) => Promise<RequestAnswer>;
  readLocal?: (entry: string) => Promise<Buffer>;
  published?: string[];
  forbidden?: string[];
  tracked?: string[];
  secrets?: string[];
  now?: () => number;
}

export interface VerifyOptions {
  origin: string;
  attempts?: number;
  delay?: number;
  timeout?: number;
  deadline?: number;
}

export async function verifyDeploy(options: VerifyOptions, deps: VerifyDeps = {}) {
  const { origin, attempts = 6, delay = 2000, timeout = 10000, deadline = 180000 } = options;
  const send = deps.request || request;
  // The reference bytes come from a fresh build: comparing against a stale dist/ on
  // disk would pass a deploy of an older build. Build once and share it across entries.
  let built: Promise<void> | undefined;
  const readLocal = deps.readLocal || (async (entry) => {
    built ??= buildSite().then(() => undefined);
    await built;
    return readFile(path.join(dist, entry));
  });
  const published = deps.published || await publishedFiles();
  const forbidden = deps.forbidden || await forbiddenPaths(published, { ...(deps.tracked ? { tracked: deps.tracked } : {}), ...(deps.secrets ? { secrets: deps.secrets } : {}) });
  const clock = deps.now || Date.now;
  const started = clock();
  const outOfTime = () => clock() - started > deadline;

  const failures: string[] = [];
  let served = 0, slow = 0, unreachable = 0, checked = 0;

  for (const entry of published) {
    if (outOfTime()) { failures.push(`gave up after ${deadline} ms with ${published.length - checked} published files unchecked`); break; }
    checked += 1;
    const result = await attempt(send, urlFor(origin, entry), { redirect: "follow", timeout }, (answer) => answer.status === 200, attempts, delay);
    if (!result.resolved) { failures.push(`${entry} never answered: ${result.error}`); continue; }
    if (result.status !== 200) { failures.push(`${entry} answered ${result.status} after ${result.attempts} attempts`); continue; }
    // A deploy is a copy of a build, so anything but byte equality with a fresh build is a bad deploy.
    const local = await readLocal(entry);
    if (sha(local) !== sha(result.body)) {
      failures.push(`${entry} is served but differs from the local build: ${result.body.length} bytes served against ${local.length} built`);
      continue;
    }
    served += 1;
    if (result.attempts > 1) slow += 1;
  }
  console.log(`  ${served}/${published.length} published files served byte for byte${slow ? `, ${slow} only after a retry` : ""}`);

  let probed = 0;
  for (const entry of forbidden) {
    if (outOfTime()) { failures.push(`gave up after ${deadline} ms with ${forbidden.length - probed} unpublished paths unchecked`); break; }
    probed += 1;
    // 403 and 410 are absence from the caller's side just as 404 is; anything else, including a
    // redirect, is not proof, and an unresolved probe is proof of nothing at all.
    const absent = (answer: RequestAnswer) => [404, 403, 410].includes(answer.status);
    const result = await attempt(send, urlFor(origin, entry), { redirect: "manual", timeout }, absent, Math.min(attempts, 3), Math.min(delay, 500));
    if (!result.resolved) failures.push(`${entry} could not be proven absent: ${result.error}`);
    else if (absent(result)) unreachable += 1;
    else failures.push(`${entry} answered ${result.status} rather than proving it is not served`);
  }
  console.log(`  ${unreachable}/${forbidden.length} unpublished paths proven unreachable`);

  return { failures, served, unreachable, published: published.length, forbidden: forbidden.length };
}

if (import.meta.main) {
  command(usage, {
    url: { type: "string" },
    attempts: { type: "string", default: "6" },
    delay: { type: "string", default: "2000" },
    timeout: { type: "string", default: "10000" },
    deadline: { type: "string", default: "180000" },
  }, async ({ values, positionals }) => {
    if (positionals.length) throw new Error(`Unexpected argument ${positionals[0]}.\n${usage}`);
    const urlValue = typeof values["url"] === "string" ? values["url"] : "";
    const origin = (urlValue || "https://skyline.devopsrockstars.com").replace(/\/$/, "");
    const numbers: Record<string, number> = {};
    for (const name of ["attempts", "delay", "timeout", "deadline"]) {
      const value = Number(values[name]), whole = name === "attempts";
      if (!Number.isFinite(value) || value < (whole ? 1 : 0) || (whole && !Number.isInteger(value))) {
        throw new Error(`--${name} takes ${whole ? "a positive whole number" : "milliseconds"}, not ${values[name]}.`);
      }
      numbers[name] = value;
    }
    const { failures, published, forbidden } = await verifyDeploy({ origin, ...numbers });
    if (failures.length) {
      for (const failure of failures) console.error(`  FAIL: ${failure}`);
      throw new Error(`${failures.length} deploy check${failures.length === 1 ? "" : "s"} failed against ${origin}.`);
    }
    console.log(`PASS: ${origin} serves all ${published} published files byte for byte, and none of the other ${forbidden} files in the repository is reachable.`);
  });
}
