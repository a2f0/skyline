// Three's Mesh.raycast tests a ray against every triangle of a mesh, and a suite casting
// thousands of rays at facades of tens of thousands of triangles spends minutes there.
// Importing this module indexes each geometry's triangles once, in a bounding-volume hierarchy
// over its own coordinates, and hands Three's triangle loop only the runs of triangles whose
// padded boxes a ray reaches, in their original order. Mesh.raycast's culling, Three's
// triangle test, and its intersection records are unchanged, so every hit, and the order of
// hits at equal distances, is what an unindexed cast returns.
import * as THREE from "../src/vendor/three-r186.js";

type Intersections = (this: THREE.Mesh, raycaster: THREE.Raycaster, intersects: THREE.Intersection[], ray: THREE.Ray) => void;
type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
// Boxes are [min x, min y, min z, max x, max y, max z]: the vendored bundle has no Box3.
interface Node { box: number[]; triangles?: number[]; left?: Node; right?: Node }
interface Index { position: Attribute; index: THREE.BufferAttribute | null; version: number; root: Node }

const mesh = THREE.Mesh.prototype as unknown as { _computeIntersections: Intersections };
const unindexed = mesh._computeIntersections;
const indexes = new WeakMap<THREE.BufferGeometry, Index>();

function build(position: Attribute, index: THREE.BufferAttribute | null): Node {
  const count = (index ? index.count : position.count) / 3, point = new THREE.Vector3();
  const boxes = Array.from({ length: count }, (_, triangle) => {
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let k = 3 * triangle; k < 3 * triangle + 3; k += 1) {
      point.fromBufferAttribute(position, index ? index.getX(k) : k);
      [point.x, point.y, point.z].forEach((value, axis) => { box[axis] = Math.min(box[axis]!, value); box[axis + 3] = Math.max(box[axis + 3]!, value); });
    }
    return box;
  });
  const split = (triangles: number[]): Node => {
    // A millimetre of padding, so rounding in the box test can never drop a triangle the ray meets.
    const box = [0, 1, 2, 3, 4, 5].map((k) => triangles.reduce((bound, triangle) => (k < 3 ? Math.min : Math.max)(bound, boxes[triangle]![k]!), k < 3 ? Infinity : -Infinity) + (k < 3 ? -1e-3 : 1e-3));
    if (triangles.length <= 8) return { box, triangles: triangles.sort((a, b) => a - b) };
    const sizes = [0, 1, 2].map((axis) => box[axis + 3]! - box[axis]!), axis = sizes.indexOf(Math.max(...sizes));
    const centre = (triangle: number) => boxes[triangle]![axis]! + boxes[triangle]![axis + 3]!;
    triangles.sort((a, b) => centre(a) - centre(b));
    return { box, left: split(triangles.slice(0, triangles.length >> 1)), right: split(triangles.slice(triangles.length >> 1)) };
  };
  return split(Array.from({ length: count }, (_, triangle) => triangle));
}

// Whether the ray's half-line meets the box: Three's triangle test reports no hit behind the origin.
function reaches({ origin, direction }: THREE.Ray, box: number[]) {
  let near = 0, far = Infinity;
  for (const [axis, from, toward] of [[0, origin.x, direction.x], [1, origin.y, direction.y], [2, origin.z, direction.z]] as const) {
    if (toward === 0) {
      if (from < box[axis]! || from > box[axis + 3]!) return false;
      continue;
    }
    const a = (box[axis]! - from) / toward, b = (box[axis + 3]! - from) / toward;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return true;
}

mesh._computeIntersections = function (raycaster, intersects, ray) {
  const geometry = this.geometry, position = geometry.getAttribute("position"), range = geometry.drawRange;
  // Skinned and morphed vertices move off the attribute the index reads, a narrowed draw range
  // is the caller's own, and grouped materials loop by group: Three casts those itself.
  if ((this as THREE.Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh || geometry.morphAttributes["position"] || Array.isArray(this.material)
    || (geometry.index ? geometry.index.count : position.count) % 3 !== 0 || range.start !== 0 || range.count !== Infinity) {
    unindexed.call(this, raycaster, intersects, ray);
    return;
  }
  // An attribute's version counts its updates, so a geometry edited after indexing is indexed again.
  const version = ("isInterleavedBufferAttribute" in position ? position.data.version : position.version) + (geometry.index?.version ?? 0);
  let entry = indexes.get(geometry);
  if (!entry || entry.position !== position || entry.index !== geometry.index || entry.version !== version) {
    entry = { position, index: geometry.index, version, root: build(position, geometry.index) };
    indexes.set(geometry, entry);
  }
  const found: number[] = [];
  const visit = (node: Node) => {
    if (!reaches(ray, node.box)) return;
    if (node.triangles) found.push(...node.triangles);
    else { visit(node.left!); visit(node.right!); }
  };
  visit(entry.root);
  found.sort((a, b) => a - b);
  try {
    for (let i = 0, j = 1; i < found.length; i = j, j = i + 1) {
      while (j < found.length && found[j] === found[j - 1]! + 1) j += 1;
      geometry.setDrawRange(3 * found[i]!, 3 * (j - i));
      unindexed.call(this, raycaster, intersects, ray);
    }
  } finally {
    geometry.setDrawRange(0, Infinity);
  }
};
