# Notices

Package metadata uses `UNLICENSED`. This release does not add a license for the
project's source code or artwork.

The self-contained viewer includes Three.js r186 under the MIT license. Its full
notice is packaged at `site/vendor/THREE-LICENSE.txt`. Imported scene and building
modules use the consuming application's `three` dependency instead.

Mapped building footprints, building parts, and streets contain data from
© OpenStreetMap contributors, under the Open Database License (ODbL) 1.0:

- [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright)
- [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/)

The complete viewer preserves its OpenStreetMap credit. Applications rendering
the scene/model modules themselves should carry the same credit. The data retains
its source way IDs and versions in `models/skyline-geography-data`; extraction
dates, measurements, assumptions, and source links are documented in the
repository's `docs/skyline-geography.md`.
