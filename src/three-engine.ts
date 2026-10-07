// The Three.js engine the viewer's scene renders with. The standalone site always uses the
// vendored bundle. In the package's assets, vendor/three-r186.js is a small module generated
// by scripts/build-package.ts that takes a host's engine from here when one was provided,
// and imports the vendored bundle otherwise; a host provides its own through `mountSkyline`'s
// `three` option, so a page that already runs Three.js does not download and run a second.
import type * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * The part of Three.js the viewer uses: `@a2f0/skyline/three` exports exactly this from the
 * host's `three`, so a host's bundler keeps no more of its engine than the viewer needs.
 */
export type SkylineThree = Pick<typeof THREE,
  | "AmbientLight" | "BoxGeometry" | "BufferGeometry" | "Color" | "DataTexture" | "DirectionalLight"
  | "EdgesGeometry" | "Float32BufferAttribute" | "Group" | "LineBasicMaterial" | "LineSegments"
  | "Mesh" | "MeshBasicMaterial" | "MeshToonMaterial" | "NearestFilter" | "PCFShadowMap"
  | "OrthographicCamera" | "PerspectiveCamera" | "Raycaster" | "RedFormat" | "Scene" | "Vector2"
  | "Vector3" | "WebGLRenderer"> & { readonly OrbitControls: typeof OrbitControls };

let provided: Promise<SkylineThree> | undefined;

/**
 * Offers a host's engine to the scene. The page's first scene takes the engine once, when its
 * code first loads: an engine offered later, or by a second instance, is not used.
 */
export function provideThree(three: SkylineThree | PromiseLike<SkylineThree>): void {
  provided ??= Promise.resolve(three);
}

/** The host's engine, if one was offered. */
export function providedThree(): Promise<SkylineThree> | undefined {
  return provided;
}
