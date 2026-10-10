// The colour trial's shade estimate (scripts/sample-colours.ts): a colour measured on a face in
// shade, as it would read in the sun, through the per-channel ratio between one material's sunlit
// and shaded faces in linear light.

// sRGB channels, 0–255, to linear light and back, and a colour as a palette hex literal.
export const linear = (channel: number) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
export const encoded = (value: number) => Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055));
export const hex = (rgb: number[]) => `0x${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

// The mean, over the pairs, of each channel's sunlit-to-shaded ratio in linear light.
export function shadeFactors(pairs: [sunlit: number[], shaded: number[]][]): number[] {
  return [0, 1, 2].map((index) => pairs.reduce((sum, [sunlit, shaded]) => sum + linear(sunlit[index]!) / linear(shaded[index]!), 0) / pairs.length);
}

// A shaded median's sunlit estimate: each channel times its factor in linear light, the whole
// scaled back to white if it passes, so it keeps its hue.
export function sunlitEstimate(shaded: number[], factors: number[]): number[] {
  const lit = shaded.map((channel, index) => linear(channel) * factors[index]!), brightest = Math.max(1, ...lit);
  return lit.map((value) => encoded(value / brightest));
}
