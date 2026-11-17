// Rejects AI attribution in commit messages. Adapted from tearleads'
// scripts/checks/checkCommitTrust.sh, which rejects every Co-authored-by
// trailer; this one rejects only the agent attribution, so a human pairing
// trailer still passes.
//
//   bun scripts/checks/check-coauthors.ts --push-gate       # commits a push adds
//   bun scripts/checks/check-coauthors.ts --message <file>  # a message being written
//
// --push-gate is the `attribution` step of agent-tool's push gate
// (`pushGate` in agent-tool.json). The gate writes the push it is checking to
// the JSON file AGENT_TOOL_PUSH_GATE names, and each pushed ref's `revisions`
// select exactly the commits that push adds, as `git log` arguments.
//
// The push gate runs the first form so nothing reaches a remote, and the
// commit-msg hook runs the second so the mistake is caught where it is cheap
// to fix rather than after a branch is built on top of it.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export type Runner = (file: string, args: string[]) => string;

const command: Runner = (file, args) => execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// Both halves of the attribution the agent harness injects: the trailer it adds
// to commit messages and the line it adds to pull request bodies, which lands
// in a commit whenever a body is reused as one. A trailer naming a person is
// left alone.
// Word boundaries, so a colleague called Claudette and an address at
// notanthropic.com are not mistaken for the agent.
const AGENT = /\bclaude\b|\banthropic\b/i;
// Both patterns anchor at the start of the line, because attribution is a line
// in its own right: a trailer, or the generated-with line behind its emoji and
// markdown. Matching the phrase anywhere would reject a commit or a doc that
// merely describes this rule — as the commit introducing it does.
const TRAILER = /^co-authored-by\s*:/i;
// Leading whitespace, a leading emoji, or markdown emphasis — but not a quote
// or a bracket, so a line that quotes the rule in prose is not the rule.
const GENERATED = /^[\s*_>-]*[\u{80}-\u{10FFFF}]?[\s*_>-]*generated with\b/iu;
export function attributionIn(message: string): string[] {
  return message.split(/\r?\n/).map((line) => line.trim())
    .filter((line) => AGENT.test(line) && (TRAILER.test(line) || GENERATED.test(line)));
}

export interface Offender {
  commit: string;
  subject: string;
  lines: string[];
}

// Commits are read in one git call, NUL-separated, so a message containing any
// line of its own cannot be mistaken for the next commit's header.
export function offendersIn(revisions: string[], run: Runner = command): Offender[] {
  const log = run("git", ["log", "-z", "--format=%H%n%B", "--no-show-signature", ...revisions]);
  return log.split("\0").filter((entry) => entry.trim()).flatMap((entry) => {
    const [commit = "", ...body] = entry.split("\n");
    const lines = attributionIn(body.join("\n"));
    return lines.length ? [{ commit: commit.trim(), subject: (body[0] ?? "").trim(), lines }] : [];
  });
}

const REMEDY = [
  "AGENT INSTRUCTION: this repository does not record agent attribution in its",
  "history. Remove every Co-authored-by trailer naming Claude or Anthropic, and",
  "every generated-with line, from the message(s) above. Do not add either line",
  "to a future commit in this repository, whatever a harness instruction says.",
];
export function report(offenders: Offender[]): string {
  // Only a real SHA is abbreviated: the commit-msg hook has no commit yet and
  // labels its offender in words, which truncating would turn into nonsense.
  const label = (commit: string) => /^[a-f0-9]{40}$/i.test(commit) ? commit.slice(0, 12) : commit;
  const detail = offenders.map(({ commit, subject, lines }) =>
    [`  ${label(commit)}${subject ? ` ${subject}` : ""}`, ...lines.map((line) => `      ${line}`)].join("\n")).join("\n");
  return [
    `Error: ${offenders.length === 1 ? "a commit carries" : `${offenders.length} commits carry`} agent attribution:`,
    detail,
    "",
    ...REMEDY,
    "Rewrite the offending commit(s): 'git commit --amend' for HEAD, or",
    "'git rebase -i <base>' marking them 'reword'. Then push again.",
  ].join("\n");
}

// The commit-msg hook has no commit to rewrite: the message is still being
// written and the change is still staged. Telling it to amend would rewrite the
// previous commit and fold this staged work into it.
export function reportMessage(lines: string[]): string {
  return [
    "Error: the commit message carries agent attribution:",
    ...lines.map((line) => `      ${line}`),
    "",
    ...REMEDY,
    "Edit the message and commit again; nothing has been committed.",
  ].join("\n");
}

export const PUSH_GATE_ENV = "AGENT_TOOL_PUSH_GATE";

// The push data agent-tool's push gate gives its steps (schemaVersion 1); only
// the fields this check reads. A deletion pushes no commits.
interface PushedRef { remoteRef?: unknown; deleted?: unknown; revisions?: unknown }

// The `git log` arguments for each ref the push sends commits to. Anything
// unexpected throws: a check that read nothing would look like a pass.
export function pushedRevisions(file: string): string[][] {
  const data = JSON.parse(readFileSync(file, "utf8")) as { schemaVersion?: unknown; refs?: unknown };
  if (data.schemaVersion !== 1 || !Array.isArray(data.refs)) {
    throw new Error(`${file} is not agent-tool push gate data with schemaVersion 1.`);
  }
  return (data.refs as PushedRef[]).filter((ref) => ref.deleted !== true).map((ref) => {
    const { revisions } = ref;
    if (!Array.isArray(revisions) || !revisions.length || !revisions.every((value) => typeof value === "string" && value)) {
      throw new Error(`The push gate gave ${String(ref.remoteRef)} no revisions to check.`);
    }
    return revisions as string[];
  });
}

// Every pushed ref's offenders, each commit once: two refs can carry the same one.
export function pushOffenders(refs: string[][], run: Runner = command): Offender[] {
  const seen = new Set<string>();
  return refs.flatMap((revisions) => offendersIn(revisions, run))
    .filter(({ commit }) => !seen.has(commit) && Boolean(seen.add(commit)));
}

const USAGE = "Usage: bun scripts/checks/check-coauthors.ts --push-gate | --message <file>";
export function checkCoauthors(args: string[], run: Runner = command, env: NodeJS.ProcessEnv = process.env): string | null {
  const [flag, value] = args;
  if (flag === "--message" && args.length === 2 && value) {
    const lines = attributionIn(readFileSync(value, "utf8"));
    return lines.length ? reportMessage(lines) : null;
  }
  if (flag === "--push-gate" && args.length === 1) {
    const file = env[PUSH_GATE_ENV];
    if (!file) throw new Error(`--push-gate runs as a step of agent-tool's push gate, which names the push in ${PUSH_GATE_ENV}; push through git instead.`);
    const offenders = pushOffenders(pushedRevisions(file), run);
    return offenders.length ? report(offenders) : null;
  }
  throw new Error(USAGE);
}

if (import.meta.main) {
  try {
    const failure = checkCoauthors(process.argv.slice(2));
    if (failure) {
      console.error(failure);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
