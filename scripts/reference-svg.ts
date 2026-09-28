// Regenerates models/skyline-reference.svg and models/skyline-panorama.svg from their source
// groups in skyline-animated.svg. Groups keep document order and their nested transforms;
// whitespace inside each tag is collapsed, and each viewBox, title, and description come from
// tests/skyline-landmarks.js.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { command } from "./lib/command.js";
import { panorama, reference } from "../tests/skyline-landmarks.js";

const excerpts = [reference, panorama];
const usage = `Usage: bun scripts/reference-svg.ts [--check]
  Rewrites ${excerpts.map(({ path: file }) => file).join(" and ")} from ${reference.source}. --check verifies them without writing.`;
const root = path.resolve(import.meta.dirname, "..");
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A group's raw text through its matching </g>, counting nested groups. The id must be the
// group's own id attribute, not the tail of data-building-id.
function extract(source: string, id: string) {
  const open = new RegExp(`<g\\s(?:[^>]*\\s)?id="${id}"`).exec(source);
  if (!open) throw new Error(`${reference.source} has no group with id ${id}.`);
  const tags = /<g[\s>]|<\/g>/g;
  tags.lastIndex = open.index;
  for (let depth = 0, tag: RegExpExecArray | null; (tag = tags.exec(source));) {
    depth += tag[0] === "</g>" ? -1 : 1;
    if (depth === 0) return { index: open.index, text: source.slice(open.index, tags.lastIndex) };
  }
  throw new Error(`Group ${id} in ${reference.source} is never closed.`);
}

function render(excerpt: typeof reference) {
  const source = readFileSync(path.join(root, excerpt.source), "utf8");
  const groups = excerpt.groups.map((id) => extract(source, id)).sort((a, b) => a.index - b.index);
  const normalized = groups.map(({ text }) => text.replace(/<[^>]*>/g, (tag) => tag.replace(/\s+/g, " ")));
  const definitions = (excerpt.defs || []).map((id) => {
    const open = new RegExp(`<([\\w-]+)\\b[^>]*\\bid="${id}"[^>]*>`).exec(source);
    if (!open) throw new Error(`${excerpt.source} has no definition with id ${id}.`);
    const close = `</${open[1]}>`, end = source.indexOf(close, open.index);
    if (end < 0) throw new Error(`Definition ${id} in ${excerpt.source} is never closed.`);
    return source.slice(open.index, end + close.length).replace(/<[^>]*>/g, (tag) => tag.replace(/\s+/g, " "));
  });
  const defs = definitions.length ? `<defs>${definitions.join("")}</defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${excerpt.viewBox}" role="img" aria-labelledby="title description"><title id="title">${escape(excerpt.title)}</title><desc id="description">${escape(excerpt.description)}</desc>${defs}${normalized.join("\n      ")}\n      </svg>\n`;
}

command(usage, { check: { type: "boolean" } }, async ({ values, positionals }) => {
  if (positionals.length) throw new Error(usage);
  for (const excerpt of excerpts) {
    const target = path.join(root, excerpt.path), svg = render(excerpt);
    if (values["check"]) {
      if (readFileSync(target, "utf8") !== svg) throw new Error(`${excerpt.path} is out of date; run bun scripts/reference-svg.ts.`);
      console.log(`PASS: ${excerpt.path} matches its ${excerpt.groups.length} source groups.`);
    } else {
      writeFileSync(target, svg);
      console.log(`Wrote ${excerpt.path} from ${excerpt.groups.length} groups.`);
    }
  }
});
