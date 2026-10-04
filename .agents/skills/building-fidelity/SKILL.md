---
name: building-fidelity
description: Find, research, and improve fidelity gaps in Skyline's existing geographic 3D buildings, maintaining a source-controlled opportunity queue and evidence. Use for building-detail accuracy or ongoing fidelity audits, not discovering or adding buildings.
---

# Building Fidelity

Improve buildings already in `geographicBuildings` in
`models/skyline-geography-data.ts`. Read repository policy, then
`docs/building-fidelity.md`, the selected building's reference audit, and its
factory in `models/skyline-geography.ts`. Paths here are relative to the repo
root, not this skill directory.

## Find the next useful improvement

Revisit open opportunities and inspect existing geometry and renders for
missing or inaccurate massing, setbacks, roofs, bays, materials, and relief.
Compare the model with its audit; a dense window grid is not evidence of
accuracy. Rank specific discrepancies by visible impact, strength of obtainable
evidence, and implementation scope. Prefer a well-supported correction over
invented detail. State which buildings were assessed; do not imply an exhaustive
ranking from a sample or treat triangle count as a fidelity score.

Honor a requested building or research-only scope. Otherwise select a tractable
existing building and explain the choice. Do not identify new silhouettes,
add building records, or extend the SVG artwork. Research can refine parts of
an existing building, but a changed mapped footprint needs specific evidence.

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

## Apply and verify

For an implementation request, make the correction in the geographic factory
used by both the skyline and building-detail page. Shared generators may also
serve the original drawing fit: preserve that fit unless the request includes
changing it. Retain geographic coordinates, metre scale, +x east / +z south,
height datums, hover ownership, and local assets. Follow building-kit rules for
closed geometry and covered faces.

Capture a baseline and compare the same camera after the change. Use
`building-detail.html?building=<existing-id>` with reduced motion for a close
view, plus `skyline-study.html?layout=geographic` or `skyline-3d.html` for placement
and occlusion. Inspect other faces when affected. The current
`scripts/render-study.ts` renders the **original** layout; its output alone
cannot validate a geographic correction.

Add meaningful regressions against independent source observations, such as
raycast-visible bay counts, setback heights, or relief. Do not merely assert
exported constants against themselves. Run relevant geometry checks and the
repository's required checks for shipping. Record actual outcomes, including
limits, in the audit; leave unvalidated work open.

## Maintain the queue

Update `docs/building-fidelity.md` in the same change: stable ID, existing
building ID, specific gap, priority/rationale, status, last assessed date,
evidence link, and next action. Use `open`, `researching`, `ready`, `implemented`,
or `blocked` (with missing evidence). Close only the corrected gap, retaining
remaining uncertainties as separate opportunities. Every pass should leave
next useful research discoverable. This is a maintained queue on invocation,
not an automatic schedule or authorization to deploy or ship; follow the
user's requested shipping workflow when given.

This repository owns identical regular-file copies in
`.agents/skills/building-fidelity` and `.claude/skills/building-fidelity`.
Update both and verify with `diff -ru` between those directories. They are not
managed by `agent-tool`. The full check also compares both copies with
`tests/building-fidelity-skill.test.ts`.
