// The colour trial's ratio estimates (scripts/sample-colours.ts), each a per-channel ratio between
// two measurements of one material in linear light: a colour measured on a face in shade, as it
// would read in the sun, through the ratio between one material's sunlit and shaded faces; and a
// colour measured in a second photograph, as the study's photograph would show it, through the
// ratio between one material's medians in the two, under the same light as the colour it calibrates.

// sRGB channels, 0–255, to linear light and back, and a colour as a palette hex literal.
export const linear = (channel: number) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
export const encoded = (value: number) => Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055));
export const hex = (rgb: number[]) => `0x${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

// The mean, over the pairs, of each channel's target-to-source ratio in linear light: sunlit to
// shaded for the shade factors, the study's photograph to the second for a calibration.
export function channelRatios(pairs: [target: number[], source: number[]][]): number[] {
  return [0, 1, 2].map((index) => pairs.reduce((sum, [target, source]) => sum + linear(target[index]!) / linear(source[index]!), 0) / pairs.length);
}

// A median scaled by the ratios: each channel times its ratio in linear light, the whole scaled
// back to white if it passes, so it keeps its hue.
export function scaled(colour: number[], ratios: number[]): number[] {
  const lit = colour.map((channel, index) => linear(channel) * ratios[index]!), brightest = Math.max(1, ...lit);
  return lit.map((value) => encoded(value / brightest));
}
