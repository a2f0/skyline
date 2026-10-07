// `@a2f0/skyline/three`: the part of the host's own Three.js the viewer uses, for
// `mountSkyline`'s `three` option. Importing it needs the `three` peer (~0.186.0). Pass the
// module, or a dynamic import of it, so the viewer shares the host's engine:
//
//   mountSkyline(container, { assetsUrl, three: import("@a2f0/skyline/three") });
export {
  AmbientLight, BoxGeometry, BufferGeometry, Color, DataTexture, DirectionalLight,
  EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments,
  Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, PCFSoftShadowMap,
  OrthographicCamera, PerspectiveCamera, Raycaster, RedFormat, Scene, Vector2, Vector3, WebGLRenderer,
} from "three";
export { OrbitControls } from "three/addons/controls/OrbitControls.js";
