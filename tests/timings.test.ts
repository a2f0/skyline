import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendRun, createTimings, logPath, readRuns, runTable, stepTable } from "../scripts/lib/timings.js";
import type { Run } from "../scripts/lib/timings.js";
import { summarise } from "../scripts/show-timings.js";

// Clocks the test drives, so a timing test does not itself depend on timing.
// Durations come from a monotonic clock and the timestamp from the wall clock,
// so both are injected.
function clock(start = 0) {
  let value = start;
  return { now: () => value, advance: (ms: number) => { value += ms; } };
}
const wall = (iso: string) => () => Date.parse(iso);

describe("recording steps", () => {
  test("measures durations on a clock that cannot go backwards", async () => {
    // A clock correction during a run that takes minutes would otherwise
    // produce a nonsense or negative duration.
    const timings = createTimings();
    const before = await timings.run("step", async () => performance.now());
    expect(before).toBeGreaterThanOrEqual(0);
    expect(timings.finish("main").seconds).toBeGreaterThanOrEqual(0);
  });
  test("times each step and totals the run", async () => {
    const time = clock();
    const timings = createTimings(time.now, wall("2026-09-27T07:41:02.000Z"));
    await timings.run("typecheck", async () => { time.advance(14_200); });
    await timings.run("build:site", async () => { time.advance(1_100); });
    const run = timings.finish("main");
    expect(run.steps).toEqual([
      { label: "typecheck", seconds: 14.2, status: "passed" },
      { label: "build:site", seconds: 1.1, status: "passed" },
    ]);
    expect(run.seconds).toBe(15.3);
    expect(run.status).toBe("passed");
    expect(run.branch).toBe("main");
    expect(run.started).toBe("2026-09-27T07:41:02.000Z");
  });
  test("records a step that threw, then lets it through", async () => {
    // The run that died is the one whose breakdown is worth reading, so the
    // failing step has to reach the table before the error propagates.
    const time = clock();
    const timings = createTimings(time.now, wall("2026-09-27T07:41:02.000Z"));
    await timings.run("typecheck", async () => { time.advance(1_000); });
    const failure = timings.run("test:building-kit", async () => { time.advance(2_500); throw new Error("boom"); });
    await expect(failure).rejects.toThrow("boom");
    const run = timings.finish("feature");
    expect(run.steps.map((step) => [step.label, step.seconds, step.status])).toEqual([
      ["typecheck", 1, "passed"],
      ["test:building-kit", 2.5, "failed"],
    ]);
    expect(run.status).toBe("failed");
  });
  test("returns the step's own value, so a timed step can still be used for its result", async () => {
    const timings = createTimings(clock().now, wall("2026-09-27T07:41:02.000Z"));
    expect(await timings.run("build:site", async () => 42)).toBe(42);
  });
});

const sample = (overrides: Partial<Run> = {}): Run => ({
  started: "2026-09-27T07:41:02.000Z", branch: "main", seconds: 15.3, status: "passed",
  steps: [{ label: "typecheck", seconds: 14.2, status: "passed" }, { label: "build:site", seconds: 1.1, status: "passed" }],
  ...overrides,
});

describe("the tables", () => {
  test("lines a step table up and totals it", () => {
    const text = stepTable(sample());
    expect(text).toContain("typecheck");
    expect(text).toContain("14.2");
    expect(text).toContain("total");
    expect(text).toContain("15.3");
    // Every line is the same width, rules included: a rule wider than the rows
    // under it reads as a rendering bug.
    expect(new Set(text.split("\n").map((line) => line.length)).size).toBe(1);
  });
  test("marks the step that failed", () => {
    const failed = sample({ status: "failed", steps: [{ label: "test:building-kit", seconds: 428.4, status: "failed" }] });
    expect(stepTable(failed)).toContain("failed");
  });
  test("marks a run that died outside any timed step, which has no failing row", () => {
    // A bad SKYLINE_BASE_SHA or a server that would not start: every row it
    // managed to record passed, and only the run's own status says otherwise.
    const outside = sample({ status: "failed" });
    expect(outside.steps.every((step) => step.status === "passed")).toBe(true);
    expect(stepTable(outside)).toContain("FAILED");
  });
  test("lists runs by clock time and result", () => {
    const text = runTable([sample(), sample({ started: "2026-09-27T08:12:55.000Z", seconds: 512.5, status: "failed" })]);
    expect(text).toContain("07:41:02");
    expect(text).toContain("08:12:55");
    expect(text).toContain("failed");
  });
});

describe("the summary ship-pr prints", () => {
  test("shows one run's steps without a comparison against itself", () => {
    const text = summarise([sample()]);
    expect(text).toContain("typecheck");
    expect(text).not.toContain("check runs:");
  });
  test("adds the per-run totals once there is more than one", () => {
    const text = summarise([sample(), sample({ started: "2026-09-27T08:12:55.000Z" })]);
    expect(text).toContain("2 check runs:");
    expect(text).toContain("08:12:55");
  });
  test("says so rather than printing an empty table when nothing is recorded", () => {
    expect(summarise([])).toContain("bun run check");
  });
});

describe("the log", () => {
  test("round-trips a run", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-timings-"));
    try {
      const file = logPath(directory);
      appendRun(file, sample());
      appendRun(file, sample({ branch: "feature" }));
      expect(readRuns(file).map((run) => run.branch)).toEqual(["main", "feature"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  test("skips a truncated or junk line instead of losing the good ones", () => {
    // A run killed mid-write leaves a partial last line.
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-timings-"));
    try {
      const file = logPath(directory);
      writeFileSync(file, `${JSON.stringify(sample())}\nnot json\n{"started":"x"}\n{"seconds":1,"steps"`);
      expect(readRuns(file).map((run) => run.branch)).toEqual(["main"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  test("skips a record that parses but whose steps are malformed", () => {
    // This one is valid JSON and has the fields a shallow check looks at, so it
    // reaches the table and crashes it, hiding every good run behind it.
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-timings-"));
    try {
      const file = logPath(directory);
      const malformed = JSON.stringify({ started: "x", branch: "main", seconds: 1, status: "passed", steps: [{}] });
      writeFileSync(file, `${malformed}\n${JSON.stringify(sample())}\n`);
      const runs = readRuns(file);
      expect(runs.map((run) => run.branch)).toEqual(["main"]);
      expect(() => stepTable(runs[0]!)).not.toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  test("does not let a truncated record swallow the next run", () => {
    // The partial line a killed run leaves behind must not be joined to the
    // next one, which would lose both and leave an older run looking latest.
    const directory = mkdtempSync(path.join(os.tmpdir(), "skyline-timings-"));
    try {
      const file = logPath(directory);
      writeFileSync(file, `${JSON.stringify(sample())}\n{"seconds":1,"steps"`);
      appendRun(file, sample({ branch: "feature" }));
      expect(readRuns(file).map((run) => run.branch)).toEqual(["main", "feature"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  test("reads no runs from a file that does not exist", () => {
    expect(readRuns(path.join(os.tmpdir(), "skyline-timings-absent", "nothing.log"))).toEqual([]);
  });
});
