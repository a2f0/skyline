import * as THREE from "../vendor/three-r186.js";
import { inside } from "./building-kit.js";
import type { Vec2 } from "./building-kit.js";
import { crainCelebrations, windowWord } from "./celebrations.js";
import type { CelebrationId } from "./celebrations.js";
import type { CrainVolume } from "./crain-tower.js";
import type { WindowIllumination } from "./window-illumination.js";

// A small lamp matrix behind each existing roof half, rather than office-sized
// window pixels. Layout estimated from the 2010/2016 photographs; the two words
// sit just below the slot floor. All units are metres in the geographic model.
const bottom = 148.6, pitchX = 0.42, pitchY = 0.64, columns = 29;
const atlasWidth = 64, atlasHeight = 8;

export function createCrainIllumination(
  glass: THREE.Mesh<THREE.BufferGeometry, THREE.MeshToonMaterial>,
  outline: THREE.MeshToonMaterial,
  volumes: readonly CrainVolume[],
  downhill: Vec2,
): WindowIllumination {
  // Looking at the southeast-facing diamond: right is northeast, up is height.
  const right: Vec2 = [downhill[1], -downhill[0]];
  const across = ([x, z]: Vec2) => x * right[0] + z * right[1];
  const panels = volumes.filter((volume) => volume.glazed).map((volume) => {
    // Intersect the roof polygon at the message's middle height to locate each
    // half's own centre. Its offset roof plane is retained, including the slot.
    const middle = bottom + 2.5 * pitchY, hits: number[] = [];
    volume.corners.forEach((a, i) => {
      const b = volume.corners[(i + 1) % volume.corners.length]!;
      const ya = volume.roof(a), yb = volume.roof(b);
      if ((ya > middle) === (yb > middle)) return;
      const t = (middle - ya) / (yb - ya);
      hits.push(across([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]));
    });
    if (hits.length !== 2) throw new Error("Crain's lamp row must cross each roof half");
    const center = (Math.min(...hits) + Math.max(...hits)) / 2;
    const intercept = volume.roof([0, 0]);
    const fall = intercept - volume.roof(downhill);
    const point = (u: number, height: number): Vec2 => {
      const d = (intercept - height) / fall;
      return [right[0] * u + downhill[0] * d, right[1] * u + downhill[1] * d];
    };
    return { ...volume, center, point, left: center - columns * pitchX / 2 };
  }).sort((a, b) => a.center - b.center).map((panel, side) => ({
    ...panel,
    // The photographed words sit a little toward the central seam, rather
    // than centred in the widest expanse of each triangular half.
    left: panel.left + (side === 0 ? 2 : -2),
  }));
  if (panels.length !== 2) throw new Error("Crain's display needs two glazed roof halves");

  const geometry = glass.geometry, positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
  const uv = new THREE.Float32BufferAttribute(new Float32Array(positions.count * 2), 2);
  const surface = new THREE.Float32BufferAttribute(new Float32Array(positions.count), 1);
  for (let i = 0; i < positions.count; i += 1) {
    // Thin slab edges and undersides are not display surfaces.
    if (normals.getY(i) < 0.5) continue;
    const p: Vec2 = [positions.getX(i), positions.getZ(i)], height = positions.getY(i);
    const panelIndex = panels.findIndex((panel) => Math.abs(panel.roof(p) - height) < 0.001);
    const panel = panels[panelIndex];
    if (!panel) throw new Error("Unmapped Crain roof vertex");
    uv.setXY(i, (panelIndex * 32 + 1 + (across(p) - panel.left) / pitchX) / atlasWidth, (1 + (height - bottom) / pitchY) / atlasHeight);
    surface.setX(i, panelIndex + 1);
  }
  geometry.setAttribute("uv", uv);
  geometry.setAttribute("crownSurface", surface);

  const masks = new Map(crainCelebrations.map((preset) => {
    if (preset.lines.length !== panels.length) throw new Error(`Crain display needs one word per roof half: ${preset.id}`);
    const pixels = new Uint8Array(atlasWidth * atlasHeight);
    let count = 0;
    preset.lines.forEach((word, side) => {
      const panel = panels[side]!, rows = windowWord(word);
      if (rows[0]!.length > columns) throw new Error(`Crain word exceeds the lamp atlas: ${word}`);
      const left = Math.floor((columns - rows[0]!.length) / 2);
      rows.forEach((row, down) => [...row].forEach((pixel, x) => {
        if (pixel !== "1") return;
        // Validate all four corners of every lamp cell against its own real
        // roof polygon; a clipped or gap-spanning letter is an error.
        for (const dx of [0, 1]) for (const dy of [0, 1]) {
          const point = panel.point(panel.left + (left + x + dx) * pitchX, bottom + (4 - down + dy) * pitchY);
          if (!inside(panel.corners, point)) throw new Error(`Crain lamp outside roof: ${word}`);
        }
        pixels[(5 - down) * atlasWidth + side * 32 + 1 + left + x] = 255;
        count += 1;
      }));
    });
    return [preset.id, { pixels, count }] as const;
  }));
  const pixels = new Uint8Array(atlasWidth * atlasHeight);
  const texture = new THREE.DataTexture(pixels, atlasWidth, atlasHeight, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  // Keep the map on the material so library consumers can discover it; disposing
  // the owning glass material also disposes this model instance's lamp texture.
  glass.material.emissiveMap = texture;
  glass.material.addEventListener("dispose", () => texture.dispose());
  const enabled = { value: 0 };
  glass.material.onBeforeCompile = (shader) => {
    shader.uniforms["crownEnabled"] = enabled;
    shader.vertexShader = `attribute float crownSurface;\nvarying float vCrownSurface;\n${shader.vertexShader}`
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCrownSurface = crownSurface;");
    shader.fragmentShader = `uniform float crownEnabled;\nvarying float vCrownSurface;\n${shader.fragmentShader}`
      .replace("#include <emissivemap_fragment>", `
        vec2 lampCell = fract(vEmissiveMapUv * vec2(${atlasWidth.toFixed(1)}, ${atlasHeight.toFixed(1)})) - 0.5;
        float panelStart = (vCrownSurface - 1.0) * 0.5;
        float onPanel = step(0.5, vCrownSurface) * step(panelStart, vEmissiveMapUv.x) * step(vEmissiveMapUv.x, panelStart + 0.5);
        float lamp = texture2D(emissiveMap, vEmissiveMapUv).r;
        lamp *= 1.0 - smoothstep(0.32, 0.49, length(lampCell));
        totalEmissiveRadiance += vec3(lamp * onPanel * crownEnabled);
      `);
  };
  glass.material.customProgramCacheKey = () => "skyline-crain-lamps-v1";
  // The photographic diamond is an illuminated perimeter, not white paint.
  // Add its light independently of the standard hover emission.
  outline.onBeforeCompile = (shader) => {
    shader.uniforms["crownEnabled"] = enabled;
    shader.fragmentShader = `uniform float crownEnabled;\n${shader.fragmentShader}`
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.7 * crownEnabled);");
  };
  outline.customProgramCacheKey = () => "skyline-crain-outline-v1";
  let active: CelebrationId | null = null, litWindows = 0;
  return {
    presets: crainCelebrations,
    get active() { return active; },
    get litWindows() { return litWindows; },
    set(next) {
      const mask = next === null ? undefined : masks.get(next);
      if (next !== null && !mask) throw new Error(`Unsupported Crain celebration: ${next}`);
      pixels.fill(0);
      if (mask) pixels.set(mask.pixels);
      texture.needsUpdate = true;
      enabled.value = mask ? 1 : 0;
      litWindows = mask?.count ?? 0;
      active = next;
    },
  };
}
