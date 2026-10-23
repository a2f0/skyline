import { describe, expect, test } from "bun:test";
import * as THREE from "../src/vendor/three-r186.js";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";
import { createGeographicBuilding } from "../src/models/skyline-geography.js";
import { unindexed } from "./indexed-raycast.js";

// The index in tests/indexed-raycast.ts stands in for Three's raycasting wherever a suite
// imports it, so every probe that expects a gap or a particular face rests on it returning
// exactly what Three does. Each check here casts the same rays both ways and compares every
// hit record, in order.
type Intersections = (this: THREE.Mesh, raycaster: THREE.Raycaster, intersects: THREE.Intersection[], ray: THREE.Ray) => void;
interface Probe { origin: THREE.Vector3; direction: THREE.Vector3; near: number; far: number }
// Three's FrontSide, BackSide and DoubleSide, which the vendored bundle does not export.
const [front, back, double] = [0, 1, 2] as const;
const prototype = THREE.Mesh.prototype as unknown as { _computeIntersections: Intersections };
const indexed = prototype._computeIntersections;

// Everything a caller can read from a hit.
const record = ({ object, distance, point, faceIndex, face, normal, uv }: THREE.Intersection) => ({
  object: object.uuid, distance, point: point.toArray(), faceIndex, uv: uv?.toArray(), normal: normal?.toArray(),
  face: face && { a: face.a, b: face.b, c: face.c, normal: face.normal.toArray(), materialIndex: face.materialIndex },
});
function cast(method: Intersections, objects: THREE.Object3D[], probes: Probe[]) {
  prototype._computeIntersections = method;
  try {
    const caster = new THREE.Raycaster();
    return probes.map(({ origin, direction, near, far }) => {
      caster.set(origin, direction);
      Object.assign(caster, { near, far });
      return caster.intersectObjects(objects, true).map(record);
    });
  } finally {
    prototype._computeIntersections = indexed;
  }
}
const expectSameHits = (objects: THREE.Object3D[], probes: Probe[]) => {
  const hits = cast(unindexed, objects, probes);
  expect(cast(indexed, objects, probes)).toEqual(hits);
  return hits.reduce((total, list) => total + list.length, 0);
};

// Rays through the objects' world bounds: along the axes, as the facade probes cast, and
// oblique; from outside and from within; some starting late or stopping short.
function probesThrough(objects: THREE.Object3D[], count: number) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity), point = new THREE.Vector3();
  for (const object of objects) {
    object.updateMatrixWorld(true);
    object.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const position = (child as THREE.Mesh).geometry.getAttribute("position");
      for (let i = 0; i < position.count; i += 1) {
        point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
        min.min(point);
        max.max(point);
      }
    });
  }
  const size = max.clone().sub(min), axes = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  return Array.from({ length: count }, (_, i): Probe => {
    const inside = new THREE.Vector3(min.x + random() * size.x, min.y + random() * size.y, min.z + random() * size.z);
    const direction = i % 4 < 2 ? new THREE.Vector3(...axes[Math.floor(random() * 6)]!) : new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    const origin = i % 2 ? inside : inside.clone().addScaledVector(direction, -(size.length() + 10));
    return { origin, direction, near: i % 7 ? 0 : 5, far: i % 11 ? Infinity : 40 };
  });
}

describe("indexed raycasting", () => {
  test("is installed for every mesh", () => {
    expect(indexed).not.toBe(unindexed);
  });

  test("hits mapped buildings exactly as Three does, placed, turned and scaled", () => {
    const placed = new THREE.Group();
    placed.position.set(13, 2, -7);
    placed.rotation.y = 0.3;
    placed.scale.setScalar(1.1);
    for (const name of ["Aon", "Crain"]) placed.add(createGeographicBuilding(geographicBuildings.find((record) => record.shortName === name)!).building);
    // Each mesh takes the indexed path: one material, the whole draw range, no morphs.
    placed.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const { geometry, material } = child as THREE.Mesh;
      expect(Array.isArray(material) || geometry.drawRange.count !== Infinity || Boolean(geometry.morphAttributes["position"]), child.name).toBe(false);
    });
    expect(expectSameHits([placed], probesThrough([placed], 800))).toBeGreaterThan(500);
  }, { timeout: 60_000 });

  test("culls front, back and double sides as Three does", () => {
    const boxes = [front, back, double].map((side, i) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10, 6, 6, 6), new THREE.MeshBasicMaterial({ side }));
      box.position.x = i * 30;
      return box;
    });
    expect(expectSameHits(boxes, probesThrough(boxes, 300))).toBeGreaterThan(100);
  });

  test("indexes a geometry again once its vertices or attribute change", () => {
    const geometry = new THREE.BoxGeometry(10, 10, 10, 6, 6, 6), box = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: double }));
    const probes = probesThrough([box], 200);
    expectSameHits([box], probes);
    // Moved vertices, flagged as Three expects, must not leave rays testing the old boxes.
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) position.setY(i, position.getY(i) * 3 + 4);
    position.needsUpdate = true;
    expect(expectSameHits([box], probes)).toBeGreaterThan(50);
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(Array.from(position.array, (value) => value * 0.5), 3));
    expect(expectSameHits([box], probes)).toBeGreaterThan(50);
  });

  test("leaves grouped materials, a narrowed draw range and morphs to Three, and restores the draw range", () => {
    // A box's faces are groups, here with a different side each.
    const sides = [front, back, double];
    const grouped = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10, 4, 4, 4), sides.flatMap((side) => [new THREE.MeshBasicMaterial({ side }), new THREE.MeshBasicMaterial({ side })]));
    const narrowed = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10, 4, 4, 4), new THREE.MeshBasicMaterial({ side: double }));
    narrowed.geometry.setDrawRange(36, 300);
    narrowed.position.x = 30;
    const morphed = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10, 4, 4, 4), new THREE.MeshBasicMaterial({ side: double }));
    const position = morphed.geometry.getAttribute("position");
    morphed.geometry.morphAttributes["position"] = [new THREE.Float32BufferAttribute(Array.from(position.array, (value, i) => (i % 3 === 1 ? value * 2 : value)), 3)];
    morphed.morphTargetInfluences = [1];
    morphed.position.x = 60;
    const meshes = [grouped, narrowed, morphed];
    expect(expectSameHits(meshes, probesThrough(meshes, 300))).toBeGreaterThan(100);
    expect([narrowed.geometry.drawRange.start, narrowed.geometry.drawRange.count]).toEqual([36, 300]);
    const whole = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10, 4, 4, 4), new THREE.MeshBasicMaterial());
    expectSameHits([whole], probesThrough([whole], 50));
    expect([whole.geometry.drawRange.start, whole.geometry.drawRange.count]).toEqual([0, Infinity]);
  });
});
