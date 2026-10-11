import * as THREE from "../vendor/three-r186.js";
import { daylightColours } from "./colour-palette.js";

// A small sky reflection over the measured glass colour. This is an illustration of an open
// sky, not a reflection of nearby buildings or a replacement for the toon renderer. The mask
// separates glass from masonry and mullions even when the builder batches them in one mesh.
// Install only in colour mode, and restore the original shader on exit. Keep the mask attached
// once used so Three.js releases its GPU buffer when it disposes the geometry.
export function glassReflection(material: THREE.MeshToonMaterial, geometry: THREE.BufferGeometry, mask: Float32Array): (enabled: boolean) => void {
  const attribute = new THREE.Float32BufferAttribute(mask, 1);
  const originalCompile = material.onBeforeCompile, originalKey = material.customProgramCacheKey;
  const key = originalKey.call(material);
  const uniforms = {
    skylineSky: { value: new THREE.Color(daylightColours.sky) },
    skylineHorizon: { value: new THREE.Color(daylightColours.horizon) },
    skylineGround: { value: new THREE.Color(0x444444) },
  };
  const compile: typeof material.onBeforeCompile = (shader, renderer) => {
    originalCompile.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
attribute float skylineGlass;
varying float vSkylineGlass;`).replace("#include <begin_vertex>", `#include <begin_vertex>
vSkylineGlass = skylineGlass;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying float vSkylineGlass;
uniform vec3 skylineSky;
uniform vec3 skylineHorizon;
uniform vec3 skylineGround;`).replace("#include <opaque_fragment>", `
if (vSkylineGlass > 0.0) {
  vec3 eye = vec3(0.0);
  eye.z = 1.0;
  if (!isOrthographic) eye = normalize(vViewPosition);
  vec3 reflected = inverseTransformDirection(reflect(-eye, normal), viewMatrix);
  vec3 sky = mix(skylineHorizon, skylineSky, smoothstep(0.0, 0.7, reflected.y));
  vec3 environment = mix(skylineGround, sky, smoothstep(-0.12, 0.12, reflected.y));
  float grazing = pow(1.0 - clamp(dot(normal, eye), 0.0, 1.0), 5.0);
  outgoingLight = mix(outgoingLight, environment, vSkylineGlass * (0.06 + 0.54 * grazing));
}
#include <opaque_fragment>`);
  };
  return (enabled) => {
    if (enabled) {
      geometry.setAttribute("skylineGlass", attribute);
      material.onBeforeCompile = compile;
      material.customProgramCacheKey = () => `${key}:skyline-glass-v1`;
    } else {
      material.onBeforeCompile = originalCompile;
      material.customProgramCacheKey = originalKey;
    }
    material.needsUpdate = true;
  };
}
