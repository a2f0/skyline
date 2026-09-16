// Command-line handling shared by the scripts in scripts/. It lives apart from
// study-page.cjs so a script that needs no browser does not pull playwright into its
// require graph: scripts/verify-deploy.cjs runs on the deploy path, where dev
// dependencies may not be installed.
const { parseArgs } = require("node:util");

// Parses flags, printing usage for --help, and reports failures without a stack trace.
function command(usage, options, main) {
  let parsed;
  try {
    parsed = parseArgs({ options: { ...options, help: { type: "boolean", short: "h" } }, allowPositionals: true });
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    process.exitCode = 2;
    return;
  }
  if (parsed.values.help) return console.log(usage);
  main(parsed).catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { command };
