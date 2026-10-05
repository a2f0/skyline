import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";

// The roof outline and visible window spacing follow the source SVG. The
// footprint, hidden faces, and lower floors obscured in the drawing are inferred.
export function createMichiganPlazaSouthBuilding(): BuildingModel {
  const building = new THREE.Group();
  building.name = "Michigan Plaza South";
  building.userData["buildingId"] = "building-michigan-plaza-south-tower";
  const width = 46.7, depth = 46.7, height = 180;
  const gradient = new THREE.DataTexture(new Uint8Array([90, 145, 205, 255]), 4, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const material = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: gradient });
  const frame = material(0x555555);
  const glass = material(0x323232);
  const recess = material(0x252525);
  const materials = [frame, glass, recess];
  let triangleCount = 0;

  function box(name: string, size: Vec3, position: Vec3, surface: THREE.MeshToonMaterial) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    triangleCount += 12;
  }
  box("closed tower shell", [width, height, depth], [0, height / 2, 0], frame);
  box("inset flat roof", [width - 1, 0.15, depth - 1], [0, height + 0.025, 0], recess);

  const windows: number[] = [], reveals: number[] = [];
  const quad = (positions: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3) => {
    for (const point of [a, b, c, a, c, d]) positions.push(...point);
  };
  const corners: Vec2[] = [[-width / 2, depth / 2], [width / 2, depth / 2], [width / 2, -depth / 2], [-width / 2, -depth / 2]];
  for (let face = 0; face < 4; face += 1) {
    const a = corners[face]!, b = corners[(face + 1) % 4]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const normal: Vec2 = [(a[1] - b[1]) / length, (b[0] - a[0]) / length];
    const point = (t: number, y: number, offset: number): Vec3 => [a[0] + (b[0] - a[0]) * t + normal[0] * offset, y, a[1] + (b[1] - a[1]) * t + normal[1] * offset];
    // Match the 24- and 23-column grids drawn on the two visible SVG faces.
    const columns = face % 2 === 0 ? 24 : 23;
    for (let row = 0; row < 40; row += 1) {
      const top = height - 13 - row * 4.1;
      const bottom = top - 2.7;
      for (let column = 0; column < columns; column += 1) {
        const left = (column + 0.22) / columns, right = (column + 0.88) / columns;
        // A dark surround and offset pane separate each opening without
        // allocating thousands of individual meshes or external textures.
        quad(reveals, point(left - 0.002, bottom - 0.08, 0.025), point(right + 0.002, bottom - 0.08, 0.025), point(right + 0.002, top + 0.08, 0.025), point(left - 0.002, top + 0.08, 0.025));
        quad(windows, point(left, bottom, 0.055), point(right, bottom, 0.055), point(right, top, 0.055), point(left, top, 0.055));
      }
    }
  }
  for (const [name, positions, surface] of [["window surrounds", reveals, recess], ["window grid", windows, glass]] as [string, number[], THREE.MeshToonMaterial][]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    triangleCount += positions.length / 9;
  }
  return {
    building, height, triangleCount,
    setHighlighted(highlighted) { materials.forEach((surface) => surface.emissive.setHex(highlighted ? 0x222222 : 0)); },
    setWireframe(enabled) { materials.forEach((surface) => { surface.wireframe = enabled; }); },
  };
}
