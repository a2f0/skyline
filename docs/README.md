# Skyline documentation

## Using the site

- [The viewer](viewer.md): the full-screen 3D skyline, its toolbar, building menu and detail
  panel, celebratory lights, the enhanced and original drawings, and the WebGL prototype.
- [3D studies](studies.md): the single-building study and the skyline study's geographic and
  original drawing layouts.
- [Celebratory window lighting](celebration-lighting.md): the display research behind the
  **lights** badges and the limits of each reconstruction.
- [Using Skyline as a package](package.md): installing, building, mounting, and importing the
  `@a2f0/skyline` ESM package, and how each merge releases it to npm.

## The drawing and the city

- [Geographic skyline comparison](skyline-geography.md): the recovered skyline camera,
  coordinates and footprints, height definitions, streets, and OpenStreetMap attribution.
- [Building labels and hover ownership](building-labels.md): what each drawn group is, how paths
  are assigned to hover groups, and corrections to the drawing.
- [Modelled buildings](buildings.md): the 34 buildings in the geographic layout, each linked to its
  reference audit (the `*-reference.md` files in this directory).
- [Buildings not yet modelled](unmodelled-buildings.md): the one drawn building still missing, and
  ranked candidates the drawing leaves out.

## Working on buildings

- [Adding a building](adding-a-building.md): the measure, model, fit, verify loop, and what the
  drawing is and is not.
- [Building fidelity opportunities](building-fidelity.md): the research queue for improving
  existing buildings, maintained by the `building-fidelity` skill. Evidence images live in
  [`fidelity/`](fidelity/).

## Working on the repository

- [Development](development.md): setup, checks, timings, Git hooks, the PR workflow, and
  re-exporting the drawing.
- [Deploying](deploying.md): publishing to Cloudflare, deploy verification, and the custom
  domain.
- [`AGENTS.md`](../AGENTS.md): repository policy for coding agents, including the shipping
  sequence.
