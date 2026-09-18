// Command-line handling shared by the scripts in scripts/. It lives apart from
// study-page.js so a script that needs no browser does not pull playwright into its
// import graph: scripts/verify-deploy.js runs on the deploy path, where dev
// dependencies may not be installed.
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

// Parses flags, printing usage for --help, and reports failures without a stack trace.
export function command(usage: string, options: ParseArgsOptionsConfig, main: (parsed: { values: Record<string, string | boolean | undefined>; positionals: string[] }) => Promise<void> | void): void {
  let parsed: { values: Record<string, string | boolean | undefined>; positionals: string[] };
  try {
    parsed = parseArgs({ options: { ...options, help: { type: "boolean", short: "h" } }, allowPositionals: true }) as typeof parsed;
  } catch (error) {
    console.error(`${(error as Error).message}\n${usage}`);
    process.exitCode = 2;
    return;
  }
  if (parsed.values["help"]) return console.log(usage);
  Promise.resolve(main(parsed)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
