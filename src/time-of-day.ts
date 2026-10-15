import * as THREE from "./vendor/three-r186.js";
import type { Daylight } from "./study-types.js";
import type { ReflectionColours } from "./models/colour-reflections.js";
import { daylightGround, daylightIntensities } from "./models/colour-materials.js";
import { timeOfDayColours } from "./models/colour-palette.js";
import { solarPosition } from "./solar-time.js";

export interface TimeLighting extends Daylight {
  reflections: ReflectionColours;
  roads: number;
}

const smooth = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

// One tiny texture per viewer, updated in place while dragging and disposed at teardown.
// Transparent night sky reveals the viewer's existing stars behind opaque buildings.
export function createTimeLighting(latitude: number, longitude: number, transparentNight: boolean) {
  const rows = 256, data = new Uint8Array(rows * 4);
  const sky = new THREE.DataTexture(data, 1, rows);
  sky.colorSpace = "srgb";
  const a = new THREE.Color(), b = new THREE.Color(), pixel = new THREE.Color();
  function blend(from: number, to: number, amount: number, coloured: boolean) {
    a.setHex(from).lerp(b.setHex(to), amount);
    if (!coloured) {
      const grey = a.r * 0.2126 + a.g * 0.7152 + a.b * 0.0722;
      a.setRGB(grey, grey, grey);
    }
    return a.getHex();
  }
  return {
    sky,
    update(date: Date, coloured: boolean): TimeLighting {
      const { elevation, direction } = solarPosition(date, latitude, longitude);
      const upper = timeOfDayColours.findIndex((stop) => stop.elevation > elevation);
      const last = timeOfDayColours.length - 1;
      const low = timeOfDayColours[upper < 0 ? last : Math.max(0, upper - 1)]!;
      const high = timeOfDayColours[upper < 0 ? last : upper]!;
      const amount = high === low ? 0 : smooth(low.elevation, high.elevation, elevation);
      const top = blend(low.sky, high.sky, amount, coloured);
      const horizon = blend(low.horizon, high.horizon, amount, coloured);
      const sun = blend(low.sun, high.sun, amount, coloured);
      const day = smooth(-6, 18, elevation);
      const opacity = transparentNight ? smooth(-18, -2, elevation) : 1;
      const topColour = new THREE.Color(top), bottomColour = new THREE.Color(horizon);
      for (let row = 0; row < rows; row += 1) {
        const hex = pixel.copy(bottomColour).lerp(topColour, row / (rows - 1)).getHex();
        // The canvas is composited with premultiplied alpha. Background textures write
        // directly to it, so premultiply the final sRGB channels here as well.
        data.set([Math.round(((hex >> 16) & 255) * opacity), Math.round(((hex >> 8) & 255) * opacity), Math.round((hex & 255) * opacity), Math.round(255 * opacity)], row * 4);
      }
      sky.needsUpdate = true;
      const ground = blend(0x161616, daylightGround.blocks, day, false);
      return {
        sky, direction, ground,
        roads: blend(0x2c2c2c, daylightGround.roads, day, false),
        sun: [sun, daylightIntensities.sun * smooth(-0.833, 8, elevation)],
        ambient: [blend(0xffffff, top, day, coloured), 0.3 + day * (daylightIntensities.ambient - 0.3)],
        fill: [blend(0xffffff, horizon, day, coloured), 0.18 + day * (daylightIntensities.fill - 0.18)],
        reflections: { sky: top, horizon, ground: blend(0x080808, 0x444444, day, false) },
      };
    },
    dispose() { sky.dispose(); },
  };
}
