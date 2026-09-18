import * as THREE from "../vendor/three-r186.js";
import type { BuildingModel, Vec2, Vec3 } from "./building-kit.js";

// An art-directed study in meters, not a surveyed reconstruction. The closed
// shell and sloping roof are geometry; windows are small, surface-mounted quads.
export function createCrainBuilding(): BuildingModel {
  const building = new THREE.Group();
  building.name = "Crain Communications Building";
  building.userData["buildingId"] = "building-crain-communications";
  const halfWidth = 27;
  const width = halfWidth * 2;
  const height = 177.4;
  const roofHeight = (x: number, z: number) => height - 42 - (x + z) * 42 / width;
  const gradient = new THREE.DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const material = (color: number, extras: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...extras });
  const stone = material(0xaaaaaa);
  const glass = material(0xffffff, { vertexColors: true });
  const roof = material(0x3a3a3a);
  const trim = material(0xaaaaaa);
  const seam = material(0x111111);
  const materials = [stone, glass, roof, trim, seam];

  // Each batch is one draw call, regardless of the number of window cells.
  interface FacadeBatch {
    name: string;
    surface: THREE.MeshToonMaterial;
    positions: number[];
    colors: number[];
  }
  function batch(name: string, surface: THREE.MeshToonMaterial): FacadeBatch {
    return { name, surface, positions: [], colors: [] };
  }
  const shell = batch("closed tower shell", stone);
  const windows = batch("facade windows", glass);
  const crown = batch("sloping diamond roof", roof);
  const ribs = batch("roof grid and rim", trim);
  const split = batch("central roof split", seam);

  function polygon(target: FacadeBatch, points: Vec3[], color?: THREE.Color) {
    for (let i = 1; i < points.length - 1; i += 1) {
      for (const point of [points[0]!, points[i]!, points[i + 1]!]) {
        target.positions.push(...point);
        if (color) target.colors.push(color.r, color.g, color.b);
      }
    }
  }

  // Clip façade details against the same plane that closes the tower. This
  // keeps floors and window cells from protruding above the diagonal crown.
  function clipToRoof(points: Vec3[]): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      const da = roofHeight(a[0], a[2]) - a[1] - 0.35;
      const db = roofHeight(b[0], b[2]) - b[1] - 0.35;
      if (da >= 0) result.push(a);
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        result.push(a.map((v, axis) => v + (b[axis]! - v) * t) as Vec3);
      }
    }
    return result;
  }

  // Counterclockwise when seen from above; side normals point outward.
  const corners: Vec2[] = [[-halfWidth, halfWidth], [halfWidth, halfWidth], [halfWidth, -halfWidth], [-halfWidth, -halfWidth]];
  for (let face = 0; face < 4; face += 1) {
    const a = corners[face]!;
    const b = corners[(face + 1) % 4]!;
    const normal: Vec3 = [(a[1] - b[1]) / width, 0, (b[0] - a[0]) / width];
    const point = (t: number, y: number, offset = 0): Vec3 => [
      a[0] + (b[0] - a[0]) * t + normal[0] * offset,
      y,
      a[1] + (b[1] - a[1]) * t + normal[2] * offset,
    ];
    polygon(shell, [point(0, 0), point(1, 0), point(1, roofHeight(...b)), point(0, roofHeight(...a))]);
    for (let floor = 0; floor < 40; floor += 1) {
      const bottom = floor === 0 ? 0.8 : 7 + (floor - 1) * 4.25;
      const top = bottom + (floor === 0 ? 5 : 2.25);
      for (let column = 0; column < 16; column += 1) {
        const left = (column + 0.08) / 16;
        const right = (column + 0.92) / 16;
        const points = clipToRoof([point(left, bottom, 0.045), point(right, bottom, 0.045), point(right, top, 0.045), point(left, top, 0.045)]);
        const hash = (floor * 137 + column * 71 + face * 43) % 103;
        const tone = floor > 0 && hash < 8 ? 0x9a9a9a : [0x272727, 0x323232, 0x3c3c3c][hash % 3]!;
        polygon(windows, points, new THREE.Color(tone));
      }
    }
  }
  polygon(shell, corners.toReversed().map(([x, z]) => [x, 0, z]));
  const onRoof = (x: number, z: number, lift = 0): Vec3 => [x, roofHeight(x, z) + lift, z];
  polygon(crown, corners.map(([x, z]) => onRoof(x, z)));

  function roofStrip(target: FacadeBatch, a: Vec2, b: Vec2, width: number, lift: number) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = -(b[1] - a[1]) / length * width / 2;
    const dz = (b[0] - a[0]) / length * width / 2;
    polygon(target, [
      onRoof(a[0] + dx, a[1] + dz, lift), onRoof(b[0] + dx, b[1] + dz, lift),
      onRoof(b[0] - dx, b[1] - dz, lift), onRoof(a[0] - dx, a[1] - dz, lift),
    ]);
  }
  for (let coordinate = -24; coordinate <= 24; coordinate += 3) {
    roofStrip(ribs, [coordinate, -halfWidth], [coordinate, halfWidth], 0.13, 0.07);
    roofStrip(ribs, [halfWidth, coordinate], [-halfWidth, coordinate], 0.13, 0.07);
  }
  corners.forEach((corner, index) => roofStrip(ribs, corner, corners[(index + 1) % 4]!, 0.6, 0.12));
  roofStrip(split, [-26.3, -26.3], [-7, -7], 2.1, 0.16);
  roofStrip(ribs, [-26.5, -24.7], [-8, -6.2], 0.3, 0.2);
  roofStrip(ribs, [-24.7, -26.5], [-6.2, -8], 0.3, 0.2);

  for (const data of [shell, windows, crown, ribs, split]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
    if (data.colors.length) geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, data.surface);
    mesh.name = data.name;
    mesh.castShadow = mesh.receiveShadow = true;
    building.add(mesh);
  }

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry((building.children[0] as THREE.Mesh).geometry, 25),
    new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.38 }),
  );
  edges.name = "silhouette edges";
  building.add(edges);

  return {
    building,
    height,
    triangleCount: [shell, windows, crown, ribs, split].reduce((count, data) => count + data.positions.length / 9, 0),
    setHighlighted(highlighted) {
      materials.forEach((surface) => surface.emissive.setHex(highlighted ? 0x222222 : 0x000000));
    },
    setWireframe(enabled) {
      materials.forEach((surface) => { surface.wireframe = enabled; });
      edges.visible = !enabled;
    },
  };
}
