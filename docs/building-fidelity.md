# Building fidelity opportunities

This queue improves **existing geographic buildings**. It does not discover or
add buildings; [Buildings not yet modelled](unmodelled-buildings.md) keeps that
research. Use `$building-fidelity` in Codex or `/building-fidelity` in
Claude Code; the repository carries the same skill in both skill directories.
Research and model changes belong in the same reviewable branch.

## Coverage and priorities

Last triage: **2026-10-05**. The registry contains 34 buildings. This first pass
compared the source and audits for Aon, Kemper, Swissôtel, Blue Cross, River
Plaza, and Millennium Park Plaza; fresh external research concentrated on Aon.
A subsequent pass researched Crain against the architect’s photographs and
owner’s leasing plans. The crown-lighting follow-up assessed Crain again using
celebration photographs, one dated 2010-06-10, correcting its shortened roof-grid ends and
reconstructing its lamp displays; those displays were withdrawn on 2026-10-05 at the owner's
request, keeping the roof-grid correction. On 2026-10-05 the building-inventory issues #63 and #72
were closed and harvested: their one gap in an existing building, the Sheraton Grand's omitted
28-level wing, became FID-SHER-001 after its map tags were rechecked; the rest moved to
[Buildings not yet modelled](unmodelled-buildings.md). On 2026-10-09 the colour trial measured six
buildings' night colours from the panorama (FID-COL-001), then, at the owner's request for a sunny
day, their daytime colours from a 2008 panorama (FID-COL-003), which replaced them; seven more
followed from the same panorama (FID-COL-004). Other buildings are not yet reassessed. Existing
detailed facades are not a claim of survey accuracy. This is a curated queue, not a score for all
34.

High priority means a visible discrepancy with usable evidence. Medium means a
visible gap whose dimensions or interpretation still need research. Low means
small detail with less skyline impact. Ordering within a priority favors the
stronger evidence and bounded implementation.

| ID | Building / registry ID | Opportunity and rationale | Priority | Status | Assessed | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- |
| FID-COL-001 | Railway Exchange, Crain, One Prudential, Two Prudential, Aon, Blue Cross | The colour toggle showed hand-picked hues. Measured each building's materials in the 2013 night panorama the drawing traces, with boxes, rules and counts. | Medium | withdrawn | 2026-10-09 | Each building's audit, under 2026-10-09 — Night colours from the panorama. Replaced in the trial by FID-COL-003 at the owner's request for a sunny day; reinstate only on request. |
| FID-COL-002 | The other 21 buildings | Grey in colour mode until measured. | Low | open | 2026-10-09 | Measure in Chicago.jpg's rendition as FID-COL-003 and FID-COL-004 did, locating each by bearing and height as FID-COL-004 did; the Michigan Avenue fronts, whose upper floors clear Grant Park's trees, are the largest visible gap. |
| FID-COL-003 | Railway Exchange, Crain, One Prudential, Two Prudential, Aon, Blue Cross | The owner asked for the colour trial on a sunny day. Measured each building's materials, on sunlit faces, in Daniel Schwen's 2008 daytime panorama from the Adler Planetarium, and Blue Cross's crown in a 2022 close-up, with boxes, rules and counts. | Medium | implemented | 2026-10-09 | Each building's audit, under 2026-10-09 — Daytime colours from Chicago.jpg; [the trial](viewer.md#colour-trial). The Railway Exchange's copper roof and plain walls and Two Prudential's spire stay grey, and One Prudential's glass mixes with its stone at this scale. |
| FID-COL-004 | Willoughby Tower, Heritage, Kemper, 330 North Wabash, Millennium Park Plaza, Trump, 340 on the Park | The next seven buildings in colour mode, measured on sunlit faces in the same 2008 panorama and located in it by bearing and roof height from the drawing's eye, with boxes, rules and counts. | Medium | implemented | 2026-10-09 | Each building's audit, under 2026-10-09 — Daytime colours from Chicago.jpg (FID-COL-004); [the trial](viewer.md#colour-trial). Trump was under construction in 2008, so its crown and spire take its glass's colour by inference; Kemper's and Willoughby's glass are small, mixed samples. |
| FID-KEM-002 | Kemper / `building-kemper` | The 2008 daytime panorama shows a white marble tower; the model's dark panes cover most of each face, so in colour it reads as a grey glass tower, its face 0.14 of the photograph's brightness. | Medium | open | 2026-10-09 | [Daytime colours and the face comparison](kemper-geographic-reference.md#2026-10-09--daytime-colours-from-chicagojpg-fid-col-004). Measure pier and window widths in a close, dated photograph and widen the marble piers before FID-KEM-001's bay count changes. |
| FID-AON-001 | Aon Center / `layer3` | Mapped model had 14 window slots per face; source plan and photograph show 15. Repeated full-height detail makes this conspicuous in close views. | High | implemented | 2026-10-04 | [Dated evidence and validation](aon-reference.md#2026-10-04-fifteen-bays-on-the-geographic-model-fid-aon-001). Retain the count independently of map notch depth. |
| FID-CRAIN-001 | Crain / `building-crain-communications` | Crown used office glazing through its metal tips and mechanical bands. Added two louver bands, three crown shadow strips and solid tips from architect photographs. | High | implemented | 2026-10-04 | [Evidence, estimates and validation](crain-reference.md#2026-10-04--crown-detail-and-roof-grid-fid-crain-001-fid-crain-002). Counts are observed; elevations remain approximate. |
| FID-CRAIN-002 | Crain / `building-crain-communications` | Roof grid followed street axes instead of downslope mullions and level crossbars. | High | implemented | 2026-10-04 | [Architect’s aerial photograph and acceptance checks](crain-reference.md#2026-10-04--crown-detail-and-roof-grid-fid-crain-001-fid-crain-002). Geographic orientation corrected; original drawing fit retained. |
| FID-CRAIN-003 | Crain / `building-crain-communications` | Crown band heights, roof-grid spacing, blade pitch and opening interiors still estimated. | Medium | open | 2026-10-04 | [Remaining uncertainties](crain-reference.md#validation-and-remaining-opportunities). Obtain a dimensioned crown elevation or dated rectifiable photographs; distinguish observed counts from absolute dimensions before refining. |
| FID-CRAIN-004 | Crain / `building-crain-communications` | Stainless-steel trim, aluminum joints and original lobby details remain simplified. | Low | open | 2026-10-04 | [Architect’s material account](crain-reference.md#new-evidence) establishes materials but not their dimensions. Seek detail drawings and dated close views before adding relief. |
| FID-CRAIN-005 | Crain / `building-crain-communications` | Documented crown messages were absent; outline lights were only diffuse paint. Lamp words on the two glass halves and outline emission during celebrations were added, then removed because the owner did not want their appearance on this tower. | High | withdrawn | 2026-10-05 | [Photographs, placement estimates and removal note](crain-reference.md#2026-10-05--crown-lamps-withdrawn-fid-crain-005). Reinstate only on the owner's request; exact lamp count and historic wiring plans remain unknown. |
| FID-CRAIN-006 | Crain / `building-crain-communications` | Geographic roof-grid bars stopped midway through bays, leaving conspicuous blank borders absent in the reference photos. Extend the bars toward the perimeter within the existing roof surfaces. | High | implemented | 2026-10-04 | [Evidence and before/after views](crain-reference.md#2026-10-04--crown-lamps-and-mullion-ends-fid-crain-005-fid-crain-006). End clearances remain approximate; grid spacing stays under FID-CRAIN-003. |
| FID-AON-002 | Aon Center / `layer3` | Mapped notches shorten main faces; 15 bays now have about 2.85 m pitch rather than nominal 3.048 m. | Medium | open | 2026-10-04 | [Plan discrepancy](aon-reference.md#plan) and the new leasing plan below it. Obtain dimensioned exterior plans, distinguish grade from upper-floor geometry, and assess notch depth before changing coordinates. |
| FID-KEM-001 | Kemper / `building-kemper` | Facade and crown rhythm still extrapolated from the drawing at estimated 3.1 m bay spacing. | Medium | open | 2026-10-04 | [Current estimates](kemper-geographic-reference.md#plan-and-detail-choices). Find owner elevations or count bays in rectifiable photographs of two faces; distinguish ordinary floors from crown slots. |
| FID-SWI-001 | Swissôtel / `building-swissotel` | 45 modeled facade rows versus the audit's published 43 floors and approximate photo count of 46 rows. | Medium | open | 2026-10-04 | [Conflicting counts](swissotel-reference.md#heights). Seek elevations or dated close photographs; separate occupied floors, mechanical rows, and the Upper Wacker datum before changing pitch. |
| FID-MPP-001 | Millennium Park Plaza / `building-michigan-plaza-front-tall` | Long faces use a generic 3 m window grid beyond what the panorama shows. | Medium | open | 2026-10-04 | [Current model limits](millennium-park-plaza-reference.md#model). Locate dated east/west elevations or photographs, count bays and distinguish the seven office floors from apartments. |
| FID-SHER-001 | Sheraton Grand / `building-buckingham-east` | The relation's 28-level part 1269924305, a wing about 50 × 23 m continuing the east arm, and a 29-level part inside its east end are omitted; the audit had called all other parts low. Projected mostly at the frame's right edge. | Medium | open | 2026-10-05 | [Map tags, extents and open questions](sheraton-grand-reference.md#2026-10-05--the-28-level-east-wing-fid-sher-001). Confirm the wing, its date and its height in photographs; model it with the arms' precast rows if it stood in 2013, or record why it stays omitted. |
| FID-BCBS-001 | Blue Cross / `building-blue-cross-blue-shield` | North lobby projection lacks facade detail. | Low | open | 2026-10-04 | [Omitted detail](blue-cross-reference.md#model). Find owner/architect north-elevation inputs with lobby dimensions before refining this existing part. |

Verify registry IDs against `src/models/skyline-geography-data.ts` before starting.
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
`blocked` names the specific missing evidence; `withdrawn` was removed by the
owner's decision, with its evidence retained. Revisit on skill invocation or
when new evidence arrives. No background schedule is installed.
