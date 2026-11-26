// The loading silhouette a viewer shows from the moment it mounts until its first frame. The
// shell (skyline-shell.ts), which hosts bundle, paints it synchronously, before any asset
// arrives; a host can paint the same silhouette in its HTML before its own code runs
// (`skylineBootMarkup` in package-assets.ts), which `mountSkyline` then continues in step.
// Both build it from the one description here, with their own styles, so the two match pixel
// for pixel. Importing it never touches the DOM.
//
// The outline draws itself left to right as a curtain of the backdrop's colour slides off it,
// then fades and repeats. Only transform and opacity animate, which the browser runs off the
// main thread, so it keeps moving while the scene's first frame is being built.
import { bootOutline } from "./skyline-boot-outline.js";

export type BootTheme = "light" | "dark";

/** An element: its tag, its attributes, and its children or text. */
export type BootNode = readonly [tag: string, attributes: Readonly<Record<string, string>>, children?: readonly BootNode[] | string];

// Set on the viewer's element, and on a host's placeholder, where it outranks the page's rules:
// `all: initial` keeps the host's rules for its elements off it, so nothing they set is
// inherited, `direction` (which `all` leaves) keeps a right-to-left page from mirroring the
// layout, and the rest fills the container. The boot palette follows; keep it in sync with
// viewer.css and index.html.
const HOST_STYLE = "all:initial;direction:ltr;display:block;position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden";
const PALETTE = {
  dark: { backdrop: "#000", text: "#aaa", ink: "#ddd" },
  light: { backdrop: "#f5f5f5", text: "#444", ink: "#555" },
} as const;

/** The inline style of the element that holds a viewer, or a host's placeholder, as it boots. */
export function bootHostStyle(theme: BootTheme): string {
  return `${HOST_STYLE};color-scheme:${theme};background-color:${PALETTE[theme].backdrop};color:${PALETTE[theme].text}`;
}

// The outline's proportions, for sizing it within the viewer.
const ratio = bootOutline.width / bootOutline.height;
// The folded control bar's height: its top border, padding and 28px star, and its bottom
// padding, which grows with a phone's home indicator (study.css's .control-bar). The outline
// stands on the bar, where the skyline will, and the bar arrives without moving it.
const bar = "calc(34px + max(5px, env(safe-area-inset-bottom)))";
// The curtain's soft leading edge, and the room the clip leaves for the stroke's round caps.
const edge = 24, bleed = 8;
const period = "4s";

/** The silhouette's styles: self-contained, so they need neither study.css nor viewer.css. */
export const BOOT_CSS = `.skyline-boot,.skyline-boot *{box-sizing:border-box;margin:0;padding:0}
.skyline-boot{position:absolute;inset:0;z-index:1;display:block;overflow:hidden;pointer-events:none;container-type:size;--boot-ink:${PALETTE.dark.ink};--boot-backdrop:${PALETTE.dark.backdrop}}
.skyline-boot[data-theme="light"]{--boot-ink:${PALETTE.light.ink};--boot-backdrop:${PALETTE.light.backdrop}}
.skyline-boot[hidden]{display:none}
.skyline-boot-frame{position:absolute;left:0;right:0;bottom:${bar};display:block;width:min(480px,80cqw,calc(30cqh * ${ratio.toFixed(4)}));aspect-ratio:${bootOutline.width}/${bootOutline.height};margin:0 auto;animation:skyline-boot-fade ${period} linear infinite}
.skyline-boot-clip{position:absolute;inset:-${bleed}px;display:block;overflow:hidden}
.skyline-boot-clip>svg{position:absolute;top:${bleed}px;left:${bleed}px;display:block;width:calc(100% - ${2 * bleed}px);height:calc(100% - ${2 * bleed}px);overflow:visible;fill:none;stroke:var(--boot-ink);stroke-width:1.6px;stroke-linejoin:round;stroke-linecap:round}
.skyline-boot-clip path{vector-effect:non-scaling-stroke}
.skyline-boot-rail{opacity:0.24}
.skyline-boot-curtain{position:absolute;inset:0;display:block;background:linear-gradient(to right,transparent,var(--boot-backdrop) ${edge}px);will-change:transform;animation:skyline-boot-sweep ${period} linear infinite}
@keyframes skyline-boot-sweep{0%{transform:translateX(-${edge}px)}78%,100%{transform:translateX(100%)}}
@keyframes skyline-boot-fade{0%{opacity:0}5%,88%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.skyline-boot-frame{animation:none;opacity:0.65}.skyline-boot-curtain{display:none;animation:none}}`;

/**
 * The silhouette: one element holding its styles, the outline under the curtain, and a faint
 * rail of the whole outline over both, so the shape shows from the start.
 */
export function bootTree(theme: BootTheme): BootNode {
  const outline = (name: string): BootNode => ["svg", { class: `skyline-boot-${name}`, viewBox: `0 0 ${bootOutline.width} ${bootOutline.height}`, "aria-hidden": "true", focusable: "false" }, [["path", { d: bootOutline.d }]]];
  return ["div", { class: "skyline-boot", "data-theme": theme, "aria-hidden": "true" }, [
    ["style", {}, BOOT_CSS],
    ["div", { class: "skyline-boot-frame" }, [
      ["div", { class: "skyline-boot-clip" }, [outline("line"), ["div", { class: "skyline-boot-curtain" }, []], outline("rail")]],
    ]],
  ]];
}

const SVG = "http://www.w3.org/2000/svg";

/** Builds the silhouette in `document`, without parsing markup, so a page's Trusted Types policy allows it. */
export function createBoot(document: Document, theme: BootTheme): HTMLElement {
  const build = ([tag, attributes, children]: BootNode, svg: boolean): Element => {
    const inSvg = svg || tag === "svg";
    const node = inSvg ? document.createElementNS(SVG, tag) : document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (typeof children === "string") node.textContent = children;
    else for (const child of children ?? []) node.append(build(child, inSvg));
    return node;
  };
  return build(bootTree(theme), false) as HTMLElement;
}

/** Escapes text for an HTML attribute value or text. */
export const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The silhouette as HTML, for a page's markup. */
export function bootHtml(node: BootNode): string {
  const [tag, attributes, children] = node;
  const attributeText = Object.entries(attributes).map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join("");
  // Style text is CSS, not HTML: it holds no markup to escape.
  const content = typeof children === "string" ? children : (children ?? []).map(bootHtml).join("");
  return `<${tag}${attributeText}>${content}</${tag}>`;
}

/** The attribute that marks a host's placeholder, whose shadow root holds a silhouette. */
export const PLACEHOLDER_ATTRIBUTE = "data-skyline-boot";
