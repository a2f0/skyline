# Adding a building to the skyline study

README's [Adding a building](../README.md#adding-a-building-to-the-skyline-study) gives the loop in
seven steps. This is the long companion to it: what the drawing actually is, how
the fit is found, and the traps that cost real time while fitting the buildings. Read the
README steps for what to do; read this for why, and for what will bite.

Two models are worked examples. `models/heritage-at-millennium-park.js` was built by hand and later
rebuilt on the kit. `models/one-prudential-plaza.js` was the first built on the kit from the start,
and most of what follows was learned doing it.

## What the drawing is, and is not

**The drawing is a parallel projection. The study is a perspective camera.** Measured on One
Prudential, all thirty-one south window rows share a slope of -0.03333 with *zero* residual, all
thirty-one east rows +0.125, and the floor pitch is identical at both ends of each face. Horizontal
lines do not converge at all. No camera placement matches that exactly, so every fit carries an
irreducible residual. Bound it and document it; do not chase it.

**Drawn groups can disagree with each other.** One Prudential's podium is drawn with a flat top
where its own tower's window rows slope -0.0333. The disagreement runs deeper than one group
against another: inside the tower's own drawn band the top edge slopes -0.0332 and its foot -0.0419,
and the penthouse top -0.0451. Only the window grid is exact. Fit each drawn group to its own edges
and record the disagreement. Splitting the difference makes both worse.

**One drawn building can be several SVG groups.** One Prudential's podium is a separate group,
`building-prudential-plaza-podium`. It belongs in `reference.groups`, has no `models` entry of its
own, and is modelled as the tower's east wing. `measure-group.js` resolves a `data-building-id` to
every group carrying it, so one call measures them together.

**Heights are measured from the study's platform, not the street.** Model `y = 0` projects to layer
y ≈ 2679 whatever the placement — that is the platform, and every building's silhouette bottom
reports it. The drawing's own ground lines sit lower, 62 units lower for One Prudential, under a
ground band the study does not model. That datum is worth ten metres: One Prudential's roof is
170 m measured from the platform and 180 m from the drawn ground, against the real 183.2 m, and the
numeric fit agrees with the platform figure to 0.3 m. The remaining three metres are the fit and the
drawing's own exaggeration.

Two consequences. **Never fit to drawn base corners** — they are below the platform plane, so no
placement reaches them; an early attempt that included them drove the depth to 86 m and the rotation
to 30° buying nothing, because the residual was unsatisfiable. And **state the datum wherever a
height appears**, in the model header and the README, or the model reads as 13 m wrong against any
published height.

**Layer space is the group parent's space**, equal to `skyline.svg`'s root and to
`models/skyline-reference.svg`'s viewBox, which is why the fidelity maths map drawing points
straight through it. Every drawing point in the spec uses it — not `skyline-animated.svg`'s root
space, which the `skyline-position` translate offsets, and not screen space. Mixing spaces
produces errors that look like a bad fit rather than a unit error.

## 1. Measure

```
bun scripts/measure-group.js <group-id> [--out dir] [--padding fraction]
```

It accepts a group id, a `data-building-id`, or the id without its `building-` prefix, and writes
per-shape ids, fills, layer-space bounds and flattened vertices as JSON, with aligned crops of the
drawing and the source photo.

- **Output files drop the `building-` prefix.** `building-kemper` writes `kemper.json`, not
  `building-kemper.json`.
- **`--padding` is a fraction of the group's size**, default `0.12`, and it is added to every side,
  so `--padding 20` gives a frame forty-one times the building, not twenty pixels.
- It opens `skyline.svg` with a 120-second timeout because the 810 KB file links an 18 MB
  photograph, `skyline.jpg`, which must arrive before the image has bounds, so the photo crop is
  slow.

Start from the fill histogram rather than the shape list. On One Prudential the fills decomposed the
facade exactly: 930 south windows as 30 × 31, 279 east as 9 × 31, 16 and 24 wing ribs, 49 louvers —
and 1,298 stroke-only outlines, one per filled shape. Counts that factor cleanly are a good sign the
reading is right.

Extract, in this order: the massing outline corners, the column centres per face, and the row
pitches. Fit the massing first; the facade follows from it.

## 2. Reframe, if the building falls outside the viewBox

This is not a local edit. Keep the reference viewBox and `fit` aspects aligned, then revisit the
camera target, platform, clipping margin, and light coverage. Every existing landmark must be
re-measured afterwards; the target can stay put if the expanded frame keeps the same center.

**Reframing silently loosens every tolerance.** Tolerances are normalized canvas units, so widening
the viewBox by a factor divides every measured error by that factor. Adding One Prudential widened
it from 2222.3 to 3055.662, a ratio of exactly 1.375, which made every pre-existing bound 37.5% more
permissive while the numbers in the file looked untouched. **Divide the existing tolerances by the
same factor** and re-verify. Trump International Hotel and Tower then widened the frame by another
1.20834767; Aon Center widened it by another 1.19979319. Inherited normalized
limits were tightened after each expansion, with small allowances only where the
new perspective fit measurably moved an existing feature.

Measured that way, reframing is a trade rather than a free win. Adding One Prudential improved the
hand-placed trio — Crain's near valley went from 0.02012 to 0.01355 — while 56 of 115 landmark and
layout pairs moved *further* from the drawing. Check both directions before claiming an improvement.

**`clippingMargin` is set by the farthest vertex from the orbit target, which is a platform corner,
not a tower.** The eight-building study uses a 750 × 580 platform and a 560-unit
margin; calculate the farthest corner again after every reframe instead of carrying an
earlier margin forward. At the minimum fitted distance, check the near plane separately too.

**Reframe the light as well as the viewer.** `shadowCamera` controls the key light's shadow
frustum separately from the viewing camera. Two Prudential's upper facade initially fell outside
it, causing shadows to stop partway up the tower. Aon's top also crossed the light's near plane;
the skyline scene moves `lightPosition` back along the same direction. The skyline suite checks
every building and platform vertex in the actual shadow camera; the solo study retains its preset.

`models/skyline-reference.svg` is generated and byte-compared. Edit `reference.viewBox`, `title`,
`description`, `groups`, or source definition ids in `defs` and then run `bun scripts/reference-svg.js`, or `bun run check` fails
early. Note that `reference-svg.js` matches a group by its `id` attribute **only** — the same
string that works for `measure-group.js` may not work here.

## 3. Fit numerically, through the real camera

Do not solve the projection analytically. Inverting it divides by `sin(-2°)`, which amplifies any
error about thirtyfold, and it ignores perspective foreshortening on a roof 170 m up, 24 m above the
orbit target. An analytic attempt returned a 117.75° corner where the Chicago grid demands 90°.

**Turn the page into a projector.** `window.__buildingStudy.projectPoint(id, point)` applies that
building's world matrix. Place the model at identity while fitting and it projects world points
directly; once the placement is solved, pass local model coordinates instead. Either way a single
page load serves an entire optimiser run, with candidate points batched through one `page.evaluate`.

**Target points above the ground band, sharp in the drawing, and spread in height.** Roof corners, a
band foot, a mast tip, wing corners. Four coplanar points are usually too few: without a long
vertical baseline the solver cannot separate size from distance.

**Depth is not recoverable from the drawing.** Moving a building away and scaling it up reproduces
the same projection. Pinning One Prudential's `towardCamera` anywhere from 16 to 60 m moved the
residual only from 8.79 to 9.48 layer units, against a tolerance of 27.5. Take depth from occlusion
instead: which group the drawing paints over which, and by how much. One Prudential is drawn after
Michigan Plaza South and its left edge falls 47.1 layer units inside Michigan's extent, so it must
stand in front.

**Verify occlusion by raycast, never by comparing projected x.** A left-of test says nothing about
which surface is nearer; one written here reported success for a placement 250 m *behind* the
building it was supposed to cover. Use the page's hover selection, which resolves by raycast, and
probe interior face points — a probe on a silhouette corner lands on sky and selects nothing.

**Regularise with soft priors, not more iterations.** Parameters that trade against each other will
wander to implausible values: 86 m depths, 30° rotations, a roof twenty metres short. Priors pulling
toward the real building keep the result architecturally plausible, which is what fitting the
drawing is supposed to mean.

For reference, both fitted buildings needed a plan about 1.3× the real footprint, and their
exaggerations are internally consistent: One Prudential's tower is 1.324× wide and 1.291× deep, its
wing 1.327× and 1.267×. One consistent exaggeration is a sign of a sound fit; two unrelated ones are
a sign of a drifting one.

```
bun scripts/fidelity-report.js [--json file] [--root dir]
```

`--json` takes a **file path**, not a boolean, and writes relative to the current directory.
`--root` serves a different checkout — an archive of `main`, say — but always uses *this* checkout's
spec, which is what makes a before-and-after comparison meaningful.

## 4. Write the model with the kit

Conventions: plans run counterclockwise from above; `+x` is east, `+z` is south; units are metres.
Plan points are `[x, z]` and vertices are `[x, y, z]`, and `point()` is the only converter — mixing
them usually produces NaN or misplaced geometry with no error, though a vertex triple in a plan can
also throw an obscure triangulation or join message instead.

Winding is checked unevenly: `prism` throws on a clockwise plan, `slab` accepts either, and `band`
checks no winding of its own — but every corner of a clockwise plan reads as concave, so a band
spanning two or more runs of one throws `A band cannot turn a concave corner` at its first corner,
open or closed. Only a single run, or runs that stay collinear, take a reversed plan silently,
facing the band inward; that mistake surfaces later at a prism, or never.

### What `omit` means

An omitted face is **a claim that another surface lies in its plane and covers it**, and
`tests/building-kit.test.js` will fail the model if none does. Only geometry within 2 mm of the omitted
face's own plane counts, so a volume that hides the face from every camera half a metre in front of
it still reads as entirely uncovered. It is not a way to skip geometry you would rather not draw.
The only exemption is a downward floor whose every corner sits at `y = 0`, which no camera sees
from below. An unknown face name throws rather than being ignored.

Face names: `box` has six; `band` has `back`, `soffit`, `top`, `start`, `end`; `prism` has `top` and
`bottom`. On a band, `omit: ["start"]` affects only the first opening and `["end"]` only the final
close — a band interrupted by `visible` always draws its intermediate returns. On a `closed` band
both are silently accepted and do nothing.

### Kit traps

- **`quad`'s `normals` must be length 1 or exactly 4.** Two or three throws an obscure `TypeError`
  from inside `triangle`, not a kit message.
- **A `color` is silently dropped** unless that batch's material was created with
  `{ vertexColors: true }`.
- **`finish({ outlines })` takes the batch objects** returned by `batch()`, not their names.
- **`box` mixes conventions**: `halfWidth` is a half-width, but `back` and `front` are absolute
  depths along the normal.
- **`arc`'s `from`/`to` are angles of the outward normal**, not of position. A concave arc keeps its
  centre outside the building, so the same angle gives the same normal.
- **`bulge` takes a sagitta**, the outward bulge depth, not a radius.
- **`prism` with a single-element `heights` emits two coincident slabs and no walls**, silently.
- The `omitted` record's `batch` field is the batch **name string**, not the batch object.

### Making geometry that is actually visible

Two of the six defects found while building One Prudential rendered wrong while passing every
assertion, and both were detail placed against the wrong surface: the renders caught the recessed
panes, and a reviewer caught the buried louvers. The corner piers below did fail the geometry suite,
which is what it is for. The rest of this list is the same family of mistake.

- **A pane set inside the wall is invisible.** The shells have no openings cut in them, so window
  panes must sit slightly *proud*. Recessing them hid every pane — 1,209 drawn windows then,
  1,173 in the model today — and the facade rendered as bare vertical stripes.
- **Detail placed at a box's origin is inside the box.** The 49 penthouse louvers were built at the
  screen's origin rather than on its south face, 8.4 m in front of it: 490 triangles, about 13% of
  the model as it then stood, that no camera could reach. Compute the visible face, not the origin.
- **Piers and ribs belong between bays.** Centring a pier on a window column buries the window.
- **Clamp end piers inside their face.** One that straddles the corner where two faces meet overlaps
  the other face's end pier, same-facing and coplanar.
- **Skip buried detail by its foot, not its head.** A row whose top clears an abutting volume can
  still be 89% inside it.
- **Close hand-raised geometry by hand.** Bare `quad`/`triangle` bypass the kit's face recording, so
  anything raised that way — a tapered mast, say — is neither closed by the kit nor recorded as an
  omission.

Where one volume buries another's detail, skip it rather than drawing it inside, as Heritage does
with `towerVisible`/`lowerVisible` and One Prudential does for the east face below its wing roof.

## 5. Add the spec

In `tests/skyline-landmarks.js`, add the model to `models` and a `fitted` entry. The comment above
`fitted` lists the fields; these are the ones that catch people.

- **Landmark names are one global namespace across all buildings.** A generic name like `roofLeft`
  or `mastTip` is already taken, and a collision throws `Landmark X is defined twice.` from inside
  the page.
- **Features are looked up by name string** (`features: "onePrudentialFeatures"`), and every key of
  the export is projected. Exporting anything that is not a point or a list of points breaks the
  measurement for the whole building.
- **A landmark must be a single `[x, y, z]`, and so must every `onGeometry` name.** Both index the
  value as one point, so a list of points fails obscurely as `NaN m`. A column entry is the one
  multi-point feature the spec consumes generically; any other is reachable only through
  `projected` in a hand-written assertion.
- **`onGeometry` distance is measured to the nearest triangle edge**, not the nearest surface, so a
  feature at the centre of a face fails even though it is on the model. Derive features from the
  same constants the geometry is built from.
- **`onGeometryTolerance` is required even with no `onGeometry` list**, because every landmark is
  geometry-checked too.
- **Column points sit on the face, or at half the proud depth.** The gap is measured forward from
  the point to the first surface, so on the wall face it reads the full proud depth and at the
  column's outer face ~0. One Prudential uses half for all five sets; Heritage's fourteen mullion
  points sit on the face and only its fin points use half.
- **The column `batch` string must equal the mesh name** exactly, which `finish()` copies from the
  `batch(name, material)` label.
- **A column array's length must equal `drawn.length`.** The drawn list is the source of truth.
- **A column set may carry its own `tolerance`.** When one part of a building is drawn less
  consistently than the rest, give that set its own bound and keep the rest tight rather than
  slackening the whole building. One Prudential's ribs use 0.009 against its tower's 0.003, worst at
  the ends and at the narrowest viewport. Every bound has to hold at all five layouts the suite
  measures — 1440x1000, 1280x800, 768x1024, 620x1400 and the 390x844 mobile page — so measure on all
  five before quoting a number.

**Set a tolerance from measurement, never to absorb an error you have not diagnosed.** A 0.014 bound
that exists to swallow a 33.5-unit residual is a bug wearing a number. When a residual is almost
purely horizontal, suspect a depth error in the feature rather than a projection disagreement: One
Prudential's penthouse landmarks were pinned to the far top edge when the drawn shape is the
penthouse's south face, whose top edge is the near one. On the correct edge the error fell from
0.011 to 0.002 and the bound came down with it.

**Until the spec entry exists, the geometry suite checks nothing about the new model.** A passing
`tests/building-kit.test.js` before that point says only that the other models are still sound.

## 6. Extend the building-specific assertions

`tests/skyline-study.test.js` holds what the shared spec cannot express. Each of these must be extended
by hand:

- **The hover loop keeps two parallel arrays** — screen `points` and `[index, id, label]` tuples.
  Append to both at the same index, and the label must equal the `models[].name` character for
  character. The probe point must be on a surface the camera sees and no neighbour occludes; both
  fitted buildings export a dedicated probe feature for it.
- **Ordering assertions** that the drawing fixes, such as a near roof corner rising above both its
  neighbours, through the shared `above()` helper.
- **Silhouette bounds**, fed by the optional `silhouette` field. Check the geometry that actually
  reaches furthest, which is not always the obvious part: One Prudential's ribs stand proud of the
  wing wall yet land 6 to 21 layer units *inside* the drawn edge, while the wall's own north-east
  corner foot passes it by 2.80, against the 3.06 the assertion allows.
- **Occlusion**, asserted through hover ownership.
- **The triangle budget**, a two-sided exclusive range. Adding detail can breach the ceiling and
  removing it the floor. Raise it deliberately and say so.

The side-view occlusion check probes Crain, but its owner depends on both lateral spacing and
depth. The side view turns the skyline view's lateral spacing into depth and its depth into lateral
spacing. Adding Aon moved the first raycast hit at this probe from One Prudential to Aon;
being the rightmost tower alone does not establish occlusion. Establish the owner by raycast
before changing the expectation.

**Never weaken an assertion to make a build pass.** If a pre-existing one starts failing, prove
whether the scene legitimately changed or your build is wrong.

## 7. Verify

```
SKYLINE_BASE_SHA=<40-char sha> bun scripts/check.js     # or bun run check
```

`SKYLINE_BASE_SHA` must be a full forty-character lowercase hex SHA; a short SHA or a branch name
aborts the whole run before any suite. The runner runs, in order: the whitespace and merge-helper
checks, the reference excerpt check, and the kit's Node suite; then, once it has started its own
server, all three browser suites — the hover regressions, the single-building study, and the
skyline study. It needs Node 22.12+ and system Google Chrome;
`bun install --ignore-scripts` installs no browser.

Then, and this is not optional:

```
bun scripts/render-study.js [--out dir] [--building id] [--root dir]
```

Stills land in `/tmp/skyline-renders` by default. `--building` accepts an id from the `models`
export. **Generating the renders is not the check; looking at them is.** They caught the recessed
panes here, which no assertion could see, because invisible geometry is neither coplanar with
anything nor an uncovered omission. Look for holes, z-fighting, anything outside the drawn
silhouette, and any detail you expected to see that is not there.

`render-study.js` exits non-zero if the page threw an uncaught error — it watches `pageerror`
only, so an error merely logged to the console will not fail it — *after* writing the stills, so a
file listing is not success and a failed run still leaves PNGs behind. Run `tests/skyline-study.test.js`
three consecutive times as a flake check; both `bun run fidelity` and `bun run renders` need the
`--` separator to pass flags.

Once it is deployed, `bun run verify:deploy` confirms the site serves the new model byte for byte
and that nothing outside the allowlist became reachable. `scripts/deploy.sh` runs it after wrangler,
because wrangler reporting success is not the same as the edge serving the files.

## Three instruments, three blind spots

The defects found building One Prudential split cleanly by what caught them, and no instrument
subsumed another:

| Instrument | Catches | Cannot see |
| --- | --- | --- |
| `tests/building-kit.test.js` | uncovered omissions, same-facing coplanar faces, degenerate or back-wound triangles — watertightness only for the kit's own fixtures, never for a fitted model | a hole no omission records, and geometry that is sound but invisible or buried |
| Renders | anything that looks wrong | anything that looks right but is measured wrong |
| Cross-agent review | claims that outrun the code: false comments, tolerances justified by reasoning the measurements refute, stale numbers | nothing it does not think to run |

Two repairs made here were themselves defective, one built on a premise the measurements disproved.
**Verify the fix, not just the finding**, and re-review a changed head.
