// The colour trial's named materials (https://github.com/a2f0/skyline/issues/115): the one file
// in the repository allowed colours, which tests/grayscale.test.ts exempts by name. Each colour
// gives a material's hue and how strongly it shows; the lightness every surface keeps is its
// model's own grey, so colour mode adds hue to the skyline without changing its values. A
// material darker than its colour here carries proportionally less of it. These are hand-picked
// from the materials and colours each building's reference audit records, not measured from
// photographs; a material with no hue stays grey.
export const colourPalette = {
  neutral: 0x808080,
  // Vision glass: the default cool tint, the teal of 340 on the Park and the Heritage, Swissôtel's
  // reflective blue-green, and the bronze tint of Illinois Center and its neighbours.
  glass: 0x525e66,
  "green glass": 0x3f6e6c,
  "blue-green glass": 0x4a8290,
  "bronze glass": 0x5a4b3e,
  // Lit offices, and the dimmer ones further in.
  "lit window": 0xf4d39a,
  "dim window": 0xb89b72,
  lamp: 0xfff0d2,
  // Stone.
  limestone: 0xd8caa8,
  marble: 0xe4dfd4,
  "white granite": 0xdcd7cd,
  granite: 0xbcb2a8,
  "dark granite": 0x62544f,
  slate: 0x4c5260,
  // Clay.
  "white terracotta": 0xe9dec4,
  "pink terracotta": 0xd8a898,
  "green tile": 0x5e8c66,
  brick: 0x9c4c38,
  "common brick": 0x8c6c5a,
  "orange brick": 0xa45a3a,
  "brown brick": 0x7c5242,
  "buff brick": 0xc9ab80,
  "glazed brick": 0xe4dfcf,
  // Concrete.
  concrete: 0xcfc9bb,
  precast: 0xdac8a2,
  // Metal and paint.
  copper: 0x6fa48f,
  maroon: 0x74282f,
  "blue enamel": 0x3e6194,
  bronze: 0x6c5034,
  "dark metal": 0x30333a,
  aluminium: 0xbfc4c9,
  stainless: 0xb4bcc6,
} as const satisfies Record<string, number>;

export type MaterialName = keyof typeof colourPalette;
