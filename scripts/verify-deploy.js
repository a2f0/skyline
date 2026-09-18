// Checks that a deployed origin serves exactly what the allowlist published.
//
// The site is a deploy-time copy, not a build, so a served file must be byte for byte the file in
// the repository. Comparing hashes rather than status codes is what makes this worth running: a 200
// proves only that something answered, and the incident this exists for — models/building-kit.js
// missing after wrangler reported it uploaded — reads identically to that file served empty.
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
import { collect, root } from "./build-site.js";
import { command } from "./lib/command.js";

const usage = `Usage: bun scripts/verify-deploy.js [--url origin] [--attempts n] [--delay ms] [--timeout ms] [--deadline ms]
  Checks that every file scripts/build-site.js publishes is served byte for byte, and that nothing
  else in the repository is reachable at all. Published files are retried, because Cloudflare's edge
  can lag a successful wrangler upload by a few seconds.
  --url defaults to https://skyline.devopsrockstars.com.`;

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

// A path is not a URL. Left raw, everything from a "#" or "?" onward is dropped before the request
// leaves, so "docs/notes#1.md" probes /docs/notes, which 404s and reads as proof that a file nobody
// asked about is absent. Each segment is encoded; "/" separates them and must survive.
const urlFor = (origin, entry) => `${origin}/${entry.split("/").map(encodeURIComponent).join("/")}`;

async function walk(directory, prefix) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const next = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await walk(path.join(directory, entry.name), next));
    else found.push(next);
  }
  return found;
}

// Everything the repository holds that the allowlist does not publish, derived rather than listed.
// A hand-kept list is a sample, and a sample cannot prove absence. `.secrets/` is gitignored, so it
// never appears in `git ls-files` and needs its own walk; it is also the directory whose exposure
// would matter most.
// git quotes any path outside plain ASCII ("docs/caf\303\251.md"), and a quoted literal probes a
// URL that is not the file, which then reads as proven absent. -z emits raw bytes instead.
const parseTracked = (stdout) => stdout.split("\0").map((entry) => entry.trim()).filter(Boolean);

async function forbiddenPaths(published, deps = {}) {
  const listed = deps.tracked
    || parseTracked((await promisify(execFile)("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 1 << 24 })).stdout);
  const secrets = deps.secrets || await walk(path.join(root, ".secrets"), ".secrets");
  const publishedSet = new Set(published);
  return [...new Set([...listed, ...secrets])].map((entry) => entry.trim()).filter(Boolean)
    .filter((entry) => !publishedSet.has(entry)).sort();
}

// A request either answers or it does not; `resolved: false` is never treated as an answer.
async function request(url, { redirect, timeout }) {
  try {
    const response = await fetch(url, { redirect, signal: AbortSignal.timeout(timeout) });
    return { resolved: true, status: response.status, body: Buffer.from(await response.arrayBuffer()) };
  } catch (error) {
    return { resolved: false, status: 0, body: Buffer.alloc(0), error: error.message };
  }
}

// Retries until `settled` accepts the answer, so a lagging edge reads as slow rather than broken.
// An unresolved request never settles: it exhausts its attempts and reports what went wrong.
async function attempt(send, url, options, settled, attempts, delay) {
  let last;
  for (let n = 1; n <= attempts; n += 1) {
    last = await send(url, options);
    if (last.resolved && settled(last)) return { ...last, attempts: n };
    if (n < attempts) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return { ...last, attempts };
}

async function verifyDeploy(options, deps = {}) {
  const { origin, attempts = 6, delay = 2000, timeout = 10000, deadline = 180000 } = options;
  const send = deps.request || request;
  const readLocal = deps.readLocal || ((entry) => readFile(path.join(root, entry)));
  const published = deps.published || await collect();
  const forbidden = deps.forbidden || await forbiddenPaths(published, deps);
  const clock = deps.now || Date.now;
  const started = clock();
  const outOfTime = () => clock() - started > deadline;

  const failures = [];
  let served = 0, slow = 0, unreachable = 0, checked = 0;

  for (const entry of published) {
    if (outOfTime()) { failures.push(`gave up after ${deadline} ms with ${published.length - checked} published files unchecked`); break; }
    checked += 1;
    const result = await attempt(send, urlFor(origin, entry), { redirect: "follow", timeout }, (answer) => answer.status === 200, attempts, delay);
    if (!result.resolved) { failures.push(`${entry} never answered: ${result.error}`); continue; }
    if (result.status !== 200) { failures.push(`${entry} answered ${result.status} after ${result.attempts} attempts`); continue; }
    // A deploy is a copy, so anything but byte equality is a bad deploy rather than a different build.
    const local = await readLocal(entry);
    if (sha(local) !== sha(result.body)) {
      failures.push(`${entry} is served but differs from the repository: ${result.body.length} bytes served against ${local.length} local`);
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
    const absent = (answer) => [404, 403, 410].includes(answer.status);
    const result = await attempt(send, urlFor(origin, entry), { redirect: "manual", timeout }, absent, Math.min(attempts, 3), Math.min(delay, 500));
    if (!result.resolved) failures.push(`${entry} could not be proven absent: ${result.error}`);
    else if (absent(result)) unreachable += 1;
    else failures.push(`${entry} answered ${result.status} rather than proving it is not served`);
  }
  console.log(`  ${unreachable}/${forbidden.length} unpublished paths proven unreachable`);

  return { failures, served, unreachable, published: published.length, forbidden: forbidden.length };
}

export { verifyDeploy, forbiddenPaths, parseTracked, urlFor, request };

if (import.meta.main) {
  command(usage, {
    url: { type: "string" },
    attempts: { type: "string", default: "6" },
    delay: { type: "string", default: "2000" },
    timeout: { type: "string", default: "10000" },
    deadline: { type: "string", default: "180000" },
  }, async ({ values, positionals }) => {
    if (positionals.length) throw new Error(`Unexpected argument ${positionals[0]}.\n${usage}`);
    const origin = (values.url || "https://skyline.devopsrockstars.com").replace(/\/$/, "");
    const numbers = {};
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
