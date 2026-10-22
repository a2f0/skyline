# Click tracking

The standalone site at `https://skyline.devopsrockstars.com` uses
[`@a2f0/ct-client`](https://github.com/a2f0/ct) to queue clicks and send batches to
`https://ct.a2f0.net/v1/clicks`. The read-only dashboard at
`https://ct-admin.a2f0.net` is currently public; events are retained for 90 days.

Each event contains a random event ID for retry deduplication, time, a fixed page
name, the element tag, and an optional developer-supplied `data-ct` label. It does
not collect text, IDs, classes, link addresses, query strings, form values or
visitor identity. Form fields, editable content and `data-ct-ignore` subtrees
are excluded. Main view and navigation buttons have fixed labels. Other clicks,
including the drawing and canvas, are counted by their element tag.

The six HTML pages and interactive SVG load `click-tracking-page.js`, which calls
the client's `init()` only on the exact production origin and a known page.
This standalone bootstrap explicitly sets `overrideGpc: true`, so clicks are
collected when Global Privacy Control (GPC) is enabled. The client's default is
`false`; the override applies only to Skyline's tracker and only to GPC.
The page's query and fragment never enter the event. Open shadow-root controls
are captured by their document; the enhanced drawing and WebGL prototype each
capture clicks inside their own iframe. Importing or mounting the reusable
Skyline package does not initialize tracking.

## Disable tracking

The CT Firefox and Chrome extension disables capture across participating sites.
Skyline still respects Do Not Track and the document's `data-ct-disabled`
attribute. GPC alone does not disable tracking on this site. To disable it without
an extension, run in its browser console:

```js
localStorage.setItem("ct:opt-out", "1");
document.dispatchEvent(new Event("ct:opt-out-change"));
```

Remove that key to re-enable tracking. Opting out discards queued clicks. The
client keeps its queue only in memory, retries temporary failures and flushes
on a timer, batch capacity, or page exit.

## Development and tests

Local development and preview origins never initialize the tracker. WebDriver
browsers and synthetic clicks are also excluded by the client. The dedicated
browser regression suite intercepts every request, serves built assets locally
under the production origin and records batches in memory; it never sends test
events to the live API. Only its explicit collection cases override WebDriver.
It verifies GPC-enabled collection on every page and the SVG, and checks that
the other opt-outs, automation guards and local or preview origin restrictions
still block collection with GPC enabled.

`scripts/build-site.ts` copies the exact pinned package's standalone ESM into
`dist/vendor/ct-client.js`; no new bundler or CDN script is needed. Its small
declaration shim resolves types from the installed package. Both runtime files
are in the published asset allowlist, including package asset copies. If a
content security policy is added, its `connect-src` must allow `https://ct.a2f0.net`.
