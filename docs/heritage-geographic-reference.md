# Heritage: geographic facade reconstruction

The geographic Heritage model uses the same east/north meter coordinates as the
rest of the comparison. The original illustration model is unchanged. This is
a source-informed exterior study, not an as-built survey or a construction model.

## References checked September 17, 2026

- [City of Chicago, Planned Development 787](https://gisapps.chicago.gov/gisimages/zoning_pds/PD787.pdf):
  PDF pages 49–52 show the ninth-floor terrace, lower tower, 28th-floor terrace,
  and upper tower plans. Pages 53–57 show the four elevations and building
  section. Page 60 shows the retained Wabash storefronts. The drawings are
  dated June 14, 2001; they describe the design, not a measured completed building.
- [Council on Tall Buildings and Urban Habitat / Skyscraper Center](https://www.skyscrapercenter.com/building/the-heritage-at-millennium-park/1897):
  completed height 192.4 m, highest occupied floor 176.8 m, 57 above-ground floors.
- [Walsh Construction project description and photograph](https://www.walshgroup.com/ourexperience/building/highriseresidential/theheritageatmillenniumpark.html):
  floors 9–57 are residential, with mechanical penthouses above. The contractor
  describes preserving four historic Wabash facades. Its east-side photograph
  provides a completed-building check on the lower wing, pale framing, dark
  glazing, upper crown and mechanical screen. Walsh counts 59 stories including
  the mechanical penthouses; this does not require 59 residential window rows.
- [OpenStreetMap ground outline 147397547](https://www.openstreetmap.org/way/147397547)
  and parts 686199648/649/650: local coordinate snapshot and attribution remain
  in `skyline-geography-data.js` and [the geographic audit](skyline-geography.md).

## Elevation controls

| Feature | Model elevation | Basis |
| --- | ---: | --- |
| Grade | 0 m | Shared flat geographic datum |
| Ninth-floor/podium terrace | 32.8176 m | Section 63743: 107 ft 8 in |
| Lower-wing / 28th-floor terrace | 89.5096 m | Section 63743: 293 ft 8 in |
| Highest occupied floor | 176.8 m | Completed-building CTBUH value |
| Main roof | 181.2036 m | Section 63743: 594 ft 6 in |
| Mechanical screen / architectural top | 192.4 m | Completed-building CTBUH value |

The design drawing's upper roof is 623 ft 8 in (190.0936 m), below the published
completed height. The model uses the completed 192.4 m top; it does not silently
scale every intermediate floor to reconcile that difference. Intermediate
residential floors are interpolated between levels 9, 28 and 57. Those floor
spacings and the design terrace/roof elevations remain estimates of the built
condition. They supersede the initial generic 84.4 m lower wing and 20.3 m podium.

## Plan and detail choices

- The entire ground outline is retained exactly in projected coordinates
  (approximately 51.3 × 87.1 m). A complete podium supports both residential
  wings. Ground placement has no illustration-derived rotation or scale.
- The upper tower follows the mapped curved/faceted polygon and stepped end
  returns. The lower east wall bows inward by an estimated 2.1 m between its
  mapped endpoints, following the concavity visible in the lower-floor plans.
  This affects the elevated wing, not the street-level footprint.
- Window modules, mullions, six-floor bands, crown fins, balcony rails, and
  roof louvers are rebuilt at meter scale using the existing building kit.
  They reuse the original model's modeling approach rather than stretching its
  exaggerated facade. Window counts and relief depths are approximations. Colors
  follow the original artwork's neutral gray palette: charcoal glazing and trim,
  gray precast, and occasional lighter windows, rather than photographic colors.
- The upper crown has inset glazing behind taller fins. A separate mechanical
  enclosure and louver screen reach the published top; the whole tower footprint
  is no longer extruded to that height.
- Four historic facade groups on Wabash use separate masonry tones and arched
  openings, alongside modern retail/parking facades. Fine ornament, individual
  storefront alterations, landscape planting and roof furnishings are omitted.
- The rooftop enclosure, balcony depths, facade bay spacings and crown setbacks
  are visually inferred. No claim of survey precision is made for those details.

All runtime geometry is local JavaScript. Reference images/PDFs are research
inputs only and are not downloaded by the viewer or redistributed with the site.

## Verification

`npm run check` checks geographic position, street-level extents, rendered tip
heights, closed meshes, triangle winding, coplanar overlaps, and the existing
layout-toggle/browser regressions. Ground extents use vertices at grade: facade
relief and balcony overhangs above grade must not redefine the street footprint.
Visual review includes east, west, north and orthographic overhead views.
