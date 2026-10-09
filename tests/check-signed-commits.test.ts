import { expect, test } from "bun:test";
import { checkSignedCommits } from "../scripts/check-signed-commits.js";

const sha = "a".repeat(40);
test("accepts signatures even when local verification or trust is unavailable", () => {
  for (const status of ["G", "U", "E", "X", "Y", "R"]) {
    expect(checkSignedCommits(["--range", "main..HEAD"], () => `${sha} ${status}\n`)).toBeNull();
  }
});
test("reports every unsigned or bad signature", () => {
  const failure = checkSignedCommits(["--range", "HEAD"], (_file, args) => args[0] === "log" ? `${sha} N\n${"b".repeat(40)} B\n` : "tree abc\n\nunsigned");
  expect(failure).toContain(`${sha}: missing or invalid signature (status: N)`);
  expect(failure).toContain(`${"b".repeat(40)}: missing or invalid signature (status: B)`);
  expect(failure).toContain("--gpg-sign");
});
test("passes revision exclusions through and permits an empty range", () => {
  expect(checkSignedCommits(["--range", sha, "--not", "--remotes=origin"], (file, args) => {
    expect(file).toBe("git");
    expect(args).toEqual(["log", "--no-show-signature", "--format=%H %G?", sha, "--not", "--remotes=origin"]);
    return "";
  })).toBeNull();
});
test("fails closed on usage errors, git errors, and unexpected records", () => {
  expect(() => checkSignedCommits([])).toThrow("Usage:");
  expect(() => checkSignedCommits(["--range"])).toThrow("Usage:");
  expect(() => checkSignedCommits(["--range", "missing"], () => { throw new Error("bad revision"); })).toThrow("bad revision");
  expect(() => checkSignedCommits(["--range", "HEAD"], () => `${sha} ?`)).toThrow("Unexpected signature record");
});

test("distinguishes missing signatures from verification that could not run", () => {
  for (const header of ["gpgsig", "gpgsig-sha256"]) {
    expect(checkSignedCommits(["--range", "HEAD"], (_file, args) =>
      args[0] === "log" ? `${sha} N\n` : `tree abc\n${header} -----BEGIN SSH SIGNATURE-----\n payload\n\nmessage`)).toBeNull();
  }
  expect(checkSignedCommits(["--range", "HEAD"], (_file, args) =>
    args[0] === "log" ? `${sha} N\n` : "tree abc\n\ngpgsig forged message line")).toContain("missing or invalid signature");
  expect(() => checkSignedCommits(["--range", "HEAD"], (_file, args) => {
    if (args[0] === "log") return `${sha} N\n`;
    throw new Error("cannot read commit");
  })).toThrow("cannot read commit");
});
