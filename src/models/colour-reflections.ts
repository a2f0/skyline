import * as THREE from "../vendor/three-r186.js";
import { daylightColours, nightColours } from "./colour-palette.js";
import type { NightLighting } from "./night-windows.js";

export interface ReflectionColours { sky: number; horizon: number; ground: number }
export const daylightReflections: ReflectionColours = { ...daylightColours, ground: 0x444444 };
export interface GlassReflection {
  (enabled: boolean): void;
  setSky(colours: ReflectionColours): void;
  setNight(lighting: NightLighting | null, coloured: boolean, celebration: boolean): void;
}

// A small sky reflection over the measured glass colour. This is an illustration of an open
// sky, not a reflection of nearby buildings or a replacement for the toon renderer. The mask
// separates glass from masonry and mullions even when the builder batches them in one mesh.
// The same shader adds night-window emission, independently of material colour. Restore the
// original shader outside colour/time previews. Keep attributes attached once used so Three.js
// releases their GPU buffers when it disposes the geometry.
export function glassReflection(material: THREE.MeshToonMaterial, geometry: THREE.BufferGeometry, mask: Float32Array, windows: Float32Array = new Float32Array(mask.length * 4)): GlassReflection {
  const attribute = new THREE.Float32BufferAttribute(mask, 1);
  const windowAttribute = new THREE.Float32BufferAttribute(windows, 4);
  const originalCompile = material.onBeforeCompile, originalKey = material.customProgramCacheKey;
  const key = originalKey.call(material);
  const uniforms = {
    skylineSky: { value: new THREE.Color(daylightColours.sky) },
    skylineHorizon: { value: new THREE.Color(daylightColours.horizon) },
    skylineGround: { value: new THREE.Color(0x444444) },
    skylineReflecting: { value: 0 },
    skylineDarkness: { value: 0 },
    skylineActivity: { value: 0 },
    skylineWindowWarm: { value: new THREE.Color(nightColours.window) },
    skylineWindowWhite: { value: new THREE.Color(nightColours.windowWhite) },
  };
  const compile: typeof material.onBeforeCompile = (shader, renderer) => {
    originalCompile.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
attribute float skylineGlass;
attribute vec4 skylineWindow;
varying float vSkylineGlass;
varying vec4 vSkylineWindow;`).replace("#include <begin_vertex>", `#include <begin_vertex>
vSkylineGlass = skylineGlass;
vSkylineWindow = skylineWindow;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying float vSkylineGlass;
varying vec4 vSkylineWindow;
uniform vec3 skylineSky;
uniform vec3 skylineHorizon;
uniform vec3 skylineGround;
uniform float skylineReflecting;
uniform float skylineDarkness;
uniform float skylineActivity;
uniform vec3 skylineWindowWarm;
uniform vec3 skylineWindowWhite;`).replace("#include <opaque_fragment>", `
if (vSkylineGlass > 0.0 && skylineReflecting > 0.0) {
  vec3 eye = vec3(0.0);
  eye.z = 1.0;
  if (!isOrthographic) eye = normalize(vViewPosition);
  vec3 reflected = inverseTransformDirection(reflect(-eye, normal), viewMatrix);
  vec3 sky = mix(skylineHorizon, skylineSky, smoothstep(0.0, 0.7, reflected.y));
  vec3 environment = mix(skylineGround, sky, smoothstep(-0.12, 0.12, reflected.y));
  float grazing = pow(1.0 - clamp(dot(normal, eye), 0.0, 1.0), 5.0);
  outgoingLight = mix(outgoingLight, environment, vSkylineGlass * (0.06 + 0.54 * grazing));
}
if (vSkylineWindow.z > 0.0 && skylineDarkness > 0.0) {
  float occupied = 1.0 - smoothstep(skylineActivity - 0.05, skylineActivity + 0.05, vSkylineWindow.x);
  float dusk = smoothstep(0.12 + 0.35 * vSkylineWindow.x, 0.45 + 0.35 * vSkylineWindow.x, skylineDarkness);
  float light = vSkylineWindow.z > 1.5 ? skylineDarkness : occupied * dusk;
  vec3 lamp = mix(skylineWindowWarm, skylineWindowWhite, vSkylineWindow.w);
  outgoingLight += lamp * vSkylineWindow.y * light;
}
#include <opaque_fragment>`);
  };
  let reflecting = false, night = false, installed = false;
  function install() {
    const enabled = reflecting || night;
    if (enabled === installed) return;
    installed = enabled;
    if (enabled) {
      geometry.setAttribute("skylineGlass", attribute);
      geometry.setAttribute("skylineWindow", windowAttribute);
      material.onBeforeCompile = compile;
      material.customProgramCacheKey = () => `${key}:skyline-facade-v2`;
    } else {
      material.onBeforeCompile = originalCompile;
      material.customProgramCacheKey = originalKey;
    }
    material.needsUpdate = true;
  }
  const set = (enabled: boolean) => {
    reflecting = enabled;
    uniforms.skylineReflecting.value = enabled ? 1 : 0;
    install();
  };
  return Object.assign(set, {
    setSky(colours: ReflectionColours) {
      uniforms.skylineSky.value.setHex(colours.sky);
      uniforms.skylineHorizon.value.setHex(colours.horizon);
      uniforms.skylineGround.value.setHex(colours.ground);
    },
    setNight(lighting: NightLighting | null, coloured: boolean, celebration: boolean) {
      night = lighting !== null;
      // A deliberately composed celebration takes precedence over ordinary office rooms.
      uniforms.skylineDarkness.value = celebration ? 0 : lighting?.darkness ?? 0;
      uniforms.skylineActivity.value = lighting?.activity ?? 0;
      for (const [uniform, hex] of [[uniforms.skylineWindowWarm, nightColours.window], [uniforms.skylineWindowWhite, nightColours.windowWhite]] as const) {
        uniform.value.setHex(hex);
        if (!coloured) {
          const { r, g, b } = uniform.value, grey = r * 0.2126 + g * 0.7152 + b * 0.0722;
          uniform.value.setRGB(grey, grey, grey);
        }
      }
      install();
    },
  });
}
