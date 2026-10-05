import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";

// Proportions follow the existing SVG, in the Crain model's scene units.
// This is a closed, reusable mesh; the footprint and unseen faces are inferred.
export function createKemperBuilding(): BuildingModel {
  const building = new THREE.Group();
  building.name = "Kemper Building";
  building.userData["buildingId"] = "building-kemper";
  const width = 31;
  const depth = 53.5;
  const height = 141;
  const gradient = new THREE.DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const material = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: gradient });
  const stone = material(0x929292);
  const glass = material(0x303030);
  const ribs = material(0x9b9b9b);
  const crown = material(0x383838);
  const materials = [stone, glass, ribs, crown];
  let triangleCount = 0;

  function box(name: string, size: Vec3, position: Vec3, surface: THREE.MeshToonMaterial): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    triangleCount += 12;
    return mesh;
  }
  const shell = box("closed tower shell", [width, height - 3, depth], [0, (height - 3) / 2, 0], stone);
  box("recessed crown", [width + 0.1, 2.1, depth + 0.1], [0, height - 1.95, 0], crown);
  box("roof cap", [width + 1.1, 0.9, depth + 1.1], [0, height - 0.45, 0], ribs);

  const windowPositions: number[] = [], ribPositions: number[] = [];
  function quad(target: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
    for (const point of [a, b, c, a, c, d]) target.push(...point);
  }
  const corners: Vec2[] = [[-width / 2, depth / 2], [width / 2, depth / 2], [width / 2, -depth / 2], [-width / 2, -depth / 2]];
  for (let face = 0; face < 4; face += 1) {
    const a = corners[face]!, b = corners[(face + 1) % 4]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const normal: Vec2 = [(a[1] - b[1]) / length, (b[0] - a[0]) / length];
    const point = (t: number, y: number, offset: number): Vec3 => [a[0] + (b[0] - a[0]) * t + normal[0] * offset, y, a[1] + (b[1] - a[1]) * t + normal[1] * offset];
    const strip = (target: number[], left: number, right: number, bottom: number, top: number, offset: number) => quad(target, point(left, bottom, offset), point(right, bottom, offset), point(right, top, offset), point(left, top, offset));
    for (let bay = 0; bay < 14; bay += 1) {
      // The SVG's left face has a broad blank panel between these window bays.
      if (face !== 0 || bay === 0 || bay >= 8) {
        const left = (bay + 0.18) / 14, right = (bay + 0.73) / 14;
        strip(windowPositions, left, right, 5, height - 3.1, 0.025);
        // Raised mullions have front and side faces, so orbiting reveals depth.
        const fin = 0.16 / length;
        strip(ribPositions, left - fin, left, 5, height - 3.1, 0.27);
        quad(ribPositions, point(left, 5, 0.025), point(left, height - 3.1, 0.025), point(left, height - 3.1, 0.27), point(left, 5, 0.27));
        strip(ribPositions, right, right + fin, 5, height - 3.1, 0.27);
        quad(ribPositions, point(right, 5, 0.27), point(right, height - 3.1, 0.27), point(right, height - 3.1, 0.025), point(right, 5, 0.025));
      }
      strip(ribPositions, (bay + 0.3) / 14, (bay + 0.38) / 14, height - 3, height - 0.9, 0.12);
    }
  }
  for (const [name, positions, surface] of [["vertical window bays", windowPositions, glass], ["raised mullions and crown slots", ribPositions, ribs]] as [string, number[], THREE.MeshToonMaterial][]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
    triangleCount += positions.length / 9;
  }
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3 }));
  edges.position.copy(shell.position);
  building.add(edges);
  return {
    building, height, triangleCount,
    setHighlighted(highlighted) { materials.forEach((surface) => surface.emissive.setHex(highlighted ? 0x222222 : 0)); },
    setWireframe(enabled) { materials.forEach((surface) => { surface.wireframe = enabled; }); edges.visible = !enabled; },
  };
}
