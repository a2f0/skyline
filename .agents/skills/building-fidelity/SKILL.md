---
name: building-fidelity
description: Find, research, and improve fidelity gaps in Skyline's existing geographic 3D buildings in grayscale and sunny-day colour, maintaining a source-controlled opportunity queue and evidence. Use for building-detail accuracy or ongoing fidelity audits, not discovering or adding buildings.
---

# Building Fidelity

Improve buildings already in `geographicBuildings` in
`src/models/skyline-geography-data.ts`. Read repository policy, then
`docs/building-fidelity.md`, the selected building's reference audit, and its
factory in `src/models/skyline-geography.ts`. Include both the default grayscale
view and the opt-in sunny-day colour trial unless the user narrows the scope.
Read `docs/viewer.md` (Colour trial), `src/models/colour-materials.ts` and
`src/models/colour-palette.ts` for the affected surfaces. Paths here are relative
to the repo root, not this skill directory.

## Find the next useful improvement

Revisit open opportunities and inspect existing geometry and renders for
missing or inaccurate massing, setbacks, roofs, bays, materials, and relief.
Assess colour gaps too: material identity, measured hue, glass versus opaque
surfaces, and the visible area each material occupies. A dark-looking facade
can be a geometry or material-assignment error, not a palette error; compare
both modes before deciding what to change.
Compare the model with its audit and with the tags of every mapped part of its
building, not only the parts it uses; a dense window grid is not evidence of
accuracy. Rank specific discrepancies by visible impact, strength of obtainable
evidence, and implementation scope. Prefer a well-supported correction over
invented detail. State which buildings were assessed; do not imply an exhaustive
ranking from a sample or treat triangle count as a fidelity score.

Honor a requested building or research-only scope. Otherwise select a tractable
existing building and explain the choice. Do not identify new silhouettes,
add building records, or extend the SVG artwork. Research can refine parts of
an existing building, but a changed mapped footprint needs specific evidence.
An omitted part of an existing building's mapped complex is a fidelity gap;
record leads about separate buildings the layout lacks in
`docs/unmodelled-buildings.md` instead of the queue.

## Gather and retain evidence

Browse for fresh inputs: owner/architect drawings, city records, engineering
project reports, and identifiable photographs. Open the source rather than
relying on search snippets. Inspect image/PDF figures used for measurements.
Record inaccessible leads as unverified, never as supporting evidence.

Update the existing `docs/*reference.md` audit, linking the queue's stable issue
ID to a dated research entry. For each input record:

- Source title, author/publisher, exact URL, access date, and publication or
  photograph date when known (otherwise say unknown).
- Page/figure/image locator and the particular claim it supports. For visual
  counts or measurements, record the method, anchors, units, and uncertainty.
- Whether the result is documented, observed, inferred, conflicting, or still
  unknown; explain which evidence wins a conflict and why.
- The model parameter or geometry affected, the resulting decision, and a
  falsifiable acceptance check. A source for total height does not establish
  facade spacing or a podium height.

Keep concise findings and links in Git, not just chat or temporary downloads.
For changeable binary references a SHA-256 helps identify the inspected version;
keep third-party files out of the repo unless their reuse rights permit it.
Original render comparisons may be committed. References must never become
runtime network dependencies. Preserve earlier dated findings and explain
superseded assumptions. Distinguish the 2013 panorama from later renovations;
record the era represented by a change rather than silently mixing dates.

## Colour evidence and material decisions

Keep the 2013 building form and the colour trial's sunny-day lighting distinct.
Use `scripts/fidelity/sample-colours.ts day <building-id>` and its source records when
revisiting measured colours; `scripts/fidelity/panorama-owners.ts` can check which mapped
face owns a panorama sample. Record the exact image/rendition, sample boxes,
pixel rules/counts, face orientation, light/shade, and any calibration reference
alongside RGB results. Photograph pixels are appearance measurements, not
intrinsic paint or glass colours. Cross-check nearby clean samples and their
references to distinguish sampling variation from uncertainty in the lighting
transfer. Do not transfer a shaded or overcast sample
into the sunny palette without documenting its calibration or provisional status.

Keep chromatic literals in `src/models/colour-palette.ts`, the repository's
single source-code exception to grayscale. Match new or renamed mesh batches
and tone overrides in `colour-materials.ts`; classify glass separately from
stone, metal and opaque spandrels so reflections reach only intended surfaces.
Retain an explicit grey fallback for unknown colours, document inferred aliases,
and leave unresolved colour opportunities open. Do not adjust shared exposure
or lighting to hide a building-specific geometry or material error.

## Apply and verify

For an implementation request, make the correction in the geographic factory
used by both the skyline and building-detail page. Shared generators may also
serve the original drawing fit: preserve that fit unless the request includes
changing it. Retain geographic coordinates, metre scale, +x east / +z south,
height datums, hover ownership, and local assets. Follow building-kit rules for
closed geometry and covered faces.

Capture before/after pairs in **both modes**, with the same camera, viewport,
and reduced motion within each pair. Use
`building-detail.html?building=<existing-id>` and the same URL with `&colour=1`
for close views; use `skyline-3d.html` and `skyline-3d.html?colour=1` for placement
and occlusion. Inspect other faces when affected. `bun scripts/fidelity/render-colours.ts --out <directory> <building-id ...>`
captures paired skyline/elevated views and front/side close-ups of the selected
buildings, checking that colour-on changes each canvas and colour-off restores
it in both detail and skyline views. `captures.json` records the successful
run's URLs, presets, viewport and artifact names. Without IDs
it uses a default sample; name the buildings assessed in this pass. The current
`scripts/fidelity/render-study.ts` renders the **original** layout; its output alone
cannot validate a geographic correction. The geographic study is useful for
placement but does not substitute for the colour-enabled pages.

Inspect material coverage and relief in grayscale, then material identity,
colour and glass reflections in daylight. Toggle colour off again and verify
restoration of the original greys and shader state. Check the embedded detail
inherits the scene's mode when changing colour integration. Record the URLs,
view presets, artifact paths and observations for each mode; a passing palette
unit test alone is not visual acceptance. For a colour-only correction, also
compare the before/after grayscale renders to verify that appearance is retained.

Retain the comparisons supporting an implemented correction in the building's
audit, with repository-relative links to original renders in `docs/fidelity/`
or a durable PR attachment. Include both modes in the before/after evidence;
temporary render directories alone do not preserve a reviewable result. A
verification-only pass can retain the current paired views without duplicating
unchanged images as before/after. Report the buildings and views actually
inspected, and distinguish a successful capture from visual acceptance.

Add meaningful regressions against independent source observations, such as
raycast-visible bay counts, setback heights, or relief. Do not merely assert
exported constants against themselves. Run relevant geometry checks and the
repository's required checks for shipping, including grayscale and colour
material/reflection coverage when those paths change. Record actual outcomes, including
limits, in the audit; leave unvalidated work open.

## Maintain the queue

Update `docs/building-fidelity.md` in the same change: stable ID, existing
building ID, specific gap (geometry, material or colour), priority/rationale, status, last assessed date,
evidence link, and next action. Use `open`, `researching`, `ready`, `implemented`,
`blocked` (with missing evidence), or `withdrawn` (removed by the owner's
decision; keep the row and evidence, and reinstate only on request). Close
only the corrected gap, retaining remaining uncertainties as separate
opportunities. Every pass should leave
next useful research discoverable. This is a maintained queue on invocation,
not an automatic schedule or authorization to deploy or ship; follow the
user's requested shipping workflow when given.

This repository owns identical regular-file copies in
`.agents/skills/building-fidelity` and `.claude/skills/building-fidelity`.
Update both and verify with `diff -ru` between those directories. They are not
managed by `agent-tool`. The full check also compares both copies with
`tests/building-fidelity-skill.test.ts`.
