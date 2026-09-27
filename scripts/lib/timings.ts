// Step timings for the check runner. Adapted from tearleads'
// scripts/lib/stepTimings.sh, in TypeScript because this repository's runner is
// TypeScript, and with the rows persisted as JSON so a later reader can print a
// table for a whole shipping session rather than one run.
//
// A step that throws is still recorded before the throw propagates: the run
// that matters most is the one that died, and "which step, and how long did it
// take to get there" is the question being asked.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type Status = "passed" | "failed";

export interface Step {
  label: string;
  seconds: number;
  status: Status;
}

export interface Run {
  started: string;
  branch: string;
  seconds: number;
  status: Status;
  steps: Step[];
}

export interface Timings {
  run<T>(label: string, work: () => Promise<T>): Promise<T>;
  // `failed` marks a run that died outside any timed step — a bad argument, a
  // server that would not start — which has no failing row to infer it from.
  finish(branch: string, failed?: boolean): Run;
}

export function createTimings(now: () => number = Date.now): Timings {
  const steps: Step[] = [];
  const startedAt = now();
  return {
    async run(label, work) {
      const from = now();
      try {
        const result = await work();
        steps.push({ label, seconds: (now() - from) / 1000, status: "passed" });
        return result;
      } catch (error) {
        steps.push({ label, seconds: (now() - from) / 1000, status: "failed" });
        throw error;
      }
    },
    finish(branch, failed = false) {
      return {
        started: new Date(startedAt).toISOString(),
        branch,
        seconds: (now() - startedAt) / 1000,
        status: failed || steps.some((step) => step.status === "failed") ? "failed" : "passed",
        steps,
      };
    },
  };
}

const seconds = (value: number) => value.toFixed(1);

// Columns are sized from their own contents, so a long step label or a run that
// took four digits of seconds still lines up.
function table(headings: [string, string, string], rows: [string, string, string][]): string {
  const widths = ([0, 1, 2] as const).map((column) => Math.max(headings[column].length, ...rows.map((row) => row[column].length)));
  const line = (row: [string, string, string], pad: string) =>
    `${row[0].padEnd(widths[0]!, pad)}  ${row[1].padStart(widths[1]!, pad)}  ${row[2].padEnd(widths[2]!, pad)}`.trimEnd();
  // The rule matches the rows, which drop a trailing empty column: a rule two
  // characters longer than everything under it is the kind of thing that reads
  // as a rendering bug.
  const rule = "─".repeat(Math.max(...[headings, ...rows].map((row) => line(row, " ").length)));
  return [line(headings, " "), rule, ...rows.map((row) => line(row, " ")), rule].join("\n");
}

export function stepTable(run: Run): string {
  const rows = run.steps.map((step) => [step.label, seconds(step.seconds), step.status === "failed" ? "failed" : ""] as [string, string, string]);
  // The total carries the run's own status, because a run can die outside any
  // timed step — a bad argument, a server that would not start — and then every
  // row it has shows as passed.
  rows.push(["total", seconds(run.seconds), run.status === "failed" ? "FAILED" : ""]);
  return table(["step", "seconds", ""], rows);
}

export function runTable(runs: Run[]): string {
  const rows = runs.map((run) => [run.started.slice(11, 19), seconds(run.seconds), run.status] as [string, string, string]);
  return table(["run (UTC)", "seconds", "result"], rows);
}

export function logPath(gitCommonDir: string): string {
  return path.join(gitCommonDir, "skyline-timings.log");
}

export function appendRun(file: string, run: Run): void {
  mkdirSync(path.dirname(file), { recursive: true });
  // A run killed mid-write leaves a line with no newline. Appending straight
  // onto it would join the two into one unparseable record, losing this run as
  // well as that one, and leaving an older run looking like the latest.
  let existing = "";
  try {
    existing = readFileSync(file, "utf8");
  } catch { /* the first run creates it */ }
  const separator = existing && !existing.endsWith("\n") ? "\n" : "";
  appendFileSync(file, `${separator}${JSON.stringify(run)}\n`);
}

// A run killed mid-write leaves a partial last line; skipping unparseable lines
// keeps one bad record from hiding every good one.
export function readRuns(file: string): Run[] {
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  return text.split("\n").flatMap((line) => {
    if (!line.trim()) return [];
    try {
      const run = JSON.parse(line) as Run;
      // Every field the tables read, not just the two that are easy to check:
      // one malformed record must not be able to crash the report and hide
      // every good run behind it.
      const sound = typeof run.seconds === "number" && typeof run.started === "string"
        && typeof run.branch === "string" && (run.status === "passed" || run.status === "failed")
        && Array.isArray(run.steps)
        && run.steps.every((step) => step && typeof step.label === "string" && typeof step.seconds === "number"
          && (step.status === "passed" || step.status === "failed"));
      return sound ? [run] : [];
    } catch {
      return [];
    }
  });
}
