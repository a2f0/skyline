# Building fidelity opportunities

This queue improves **existing geographic buildings**. It does not discover or
add buildings. Use `$building-fidelity` in Codex or `/building-fidelity` in
Claude Code; the repository carries the same skill in both skill directories.
Research and model changes belong in the same reviewable branch.

## Coverage and priorities

Last triage: **2026-10-04**. The registry contains 34 buildings. This first pass
compared the source and audits for Aon, Kemper, Swissôtel, Blue Cross, River
Plaza, and Millennium Park Plaza; fresh external research concentrated on Aon.
Other buildings are not yet reassessed. Existing detailed facades are not a
claim of survey accuracy. This is a curated queue, not a score for all 34.

High priority means a visible discrepancy with usable evidence. Medium means a
visible gap whose dimensions or interpretation still need research. Low means
small detail with less skyline impact. Ordering within a priority favors the
stronger evidence and bounded implementation.

| ID | Building / registry ID | Opportunity and rationale | Priority | Status | Assessed | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- |
| FID-AON-001 | Aon Center / `layer3` | Mapped model had 14 window slots per face; source plan and photograph show 15. Repeated full-height detail makes this conspicuous in close views. | High | implemented | 2026-10-04 | [Dated evidence and validation](aon-reference.md#2026-10-04-fifteen-bays-on-the-geographic-model-fid-aon-001). Retain the count independently of map notch depth. |
| FID-AON-002 | Aon Center / `layer3` | Mapped notches shorten main faces; 15 bays now have about 2.85 m pitch rather than nominal 3.048 m. | Medium | open | 2026-10-04 | [Plan discrepancy](aon-reference.md#plan) and the new leasing plan below it. Obtain dimensioned exterior plans, distinguish grade from upper-floor geometry, and assess notch depth before changing coordinates. |
| FID-KEM-001 | Kemper / `building-kemper` | Facade and crown rhythm still extrapolated from the drawing at estimated 3.1 m bay spacing. | Medium | open | 2026-10-04 | [Current estimates](kemper-geographic-reference.md#plan-and-detail-choices). Find owner elevations or count bays in rectifiable photographs of two faces; distinguish ordinary floors from crown slots. |
| FID-SWI-001 | Swissôtel / `building-swissotel` | 45 modeled facade rows versus the audit's published 43 floors and approximate photo count of 46 rows. | Medium | open | 2026-10-04 | [Conflicting counts](swissotel-reference.md#heights). Seek elevations or dated close photographs; separate occupied floors, mechanical rows, and the Upper Wacker datum before changing pitch. |
| FID-MPP-001 | Millennium Park Plaza / `building-michigan-plaza-front-tall` | Long faces use a generic 3 m window grid beyond what the panorama shows. | Medium | open | 2026-10-04 | [Current model limits](millennium-park-plaza-reference.md#model). Locate dated east/west elevations or photographs, count bays and distinguish the seven office floors from apartments. |
| FID-BCBS-001 | Blue Cross / `building-blue-cross-blue-shield` | North lobby projection lacks facade detail. | Low | open | 2026-10-04 | [Omitted detail](blue-cross-reference.md#model). Find owner/architect north-elevation inputs with lobby dimensions before refining this existing part. |

Verify registry IDs against `models/skyline-geography-data.ts` before starting.
River Plaza's frame and rooftop box were inspected; no new bounded correction
was established in this pass, so no speculative task was added for it.

## Maintaining the record

Keep IDs stable and retain implemented rows. Each pass updates assessed dates,
status, evidence and next action, then adds dated evidence to the building's
existing reference audit. Link sources to individual claims and record access
date, source date if known, page/image location, measurement method, confidence,
conflicts, model decision, and actual validation. Never present an inaccessible
source as inspected. Keep unsolved details open even after another gap is fixed.

Statuses: `open` needs research; `researching` is active; `ready` has sufficient
evidence for a bounded change; `implemented` has geometry and validation;
`blocked` names the specific missing evidence. Revisit on skill invocation or
when new evidence arrives. No background schedule is installed.
