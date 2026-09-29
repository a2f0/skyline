import * as THREE from "../vendor/three-r186.js";
import { line } from "./building-kit.js";
import type { BuildingModel, Plan, Vec2, Vec3 } from "./building-kit.js";
import { geographicBuildings, geographicStreets } from "./skyline-geography-data.js";
import type { GeoBuilding } from "./skyline-geography-data.js";
import { createAonGeographicBuilding } from "./aon-geographic.js";
import { createBlueCrossGeographicBuilding } from "./blue-cross-geographic.js";
import { createBorgWarnerGeographicBuilding } from "./borg-warner-geographic.js";
import { createBuckinghamGeographicBuilding } from "./buckingham-geographic.js";
import { createChicagoAthleticAssociationGeographicBuilding } from "./chicago-athletic-association-geographic.js";
import { createCrainGeographicBuilding } from "./crain-geographic.js";
import { createGageGeographicBuilding } from "./gage-geographic.js";
import { createHeritageGeographicBuilding } from "./heritage-geographic.js";
import { createHyattWestTowerGeographicBuilding } from "./hyatt-west-tower-geographic.js";
import { createAscherGeographicBuilding, createKeithGeographicBuilding } from "./keith-ascher-geographic.js";
import { createKemperGeographicBuilding } from "./kemper-geographic.js";
import { createLakeViewGeographicBuilding } from "./lake-view-geographic.js";
import { createMacleanCenterGeographicBuilding } from "./maclean-center-geographic.js";
import { createMichiganBoulevardGeographicBuilding } from "./michigan-boulevard-geographic.js";
import { createMichiganPlazaSouthGeographicBuilding } from "./michigan-plaza-south-geographic.js";
import { createMillenniumParkPlazaGeographicBuilding } from "./millennium-park-plaza-geographic.js";
import { createMonroeGeographicBuilding } from "./monroe-geographic.js";
import { createNorthMichigan180GeographicBuilding } from "./north-michigan-180-geographic.js";
import { createNorthWabashGeographicBuilding } from "./north-wabash-geographic.js";
import { createOnTheParkGeographicBuilding } from "./on-the-park-geographic.js";
import { createOnePrudentialGeographicBuilding } from "./one-prudential-geographic.js";
import { createPeoplesGasGeographicBuilding } from "./peoples-gas-geographic.js";
import { createRailwayExchangeGeographicBuilding } from "./railway-exchange-geographic.js";
import { createRiverPlazaGeographicBuilding } from "./river-plaza-geographic.js";
import { createSixNorthMichiganGeographicBuilding } from "./six-north-michigan-geographic.js";
import { createTrumpGeographicBuilding } from "./trump-geographic.js";
import { createTwoIllinoisCenterGeographicBuilding } from "./two-illinois-center-geographic.js";
import { createTwoPrudentialGeographicBuilding } from "./two-prudential-geographic.js";
import { createUniversityClubGeographicBuilding } from "./university-club-geographic.js";
import { createWilloughbyTowerGeographicBuilding } from "./willoughby-tower-geographic.js";

// Local WGS84 tangent plane, centered on the bounding-box center of Crain's
// mapped footprint. Ground coordinates are east/north meters; Three uses x/-z.
export const geographicOrigin: [number, number] = [-87.62497155, 41.88482645];
const radians = Math.PI / 180;
const latitude = geographicOrigin[1] * radians;
const eccentricitySquared = 6.69437999014e-3;
const w = Math.sqrt(1 - eccentricitySquared * Math.sin(latitude) ** 2);
const eastPerDegree = 6378137 / w * Math.cos(latitude) * radians;
const northPerDegree = 6378137 * (1 - eccentricitySquared) / w ** 3 * radians;
export function projectGround([longitude, lat]: [number, number]): [number, number] {
  return [(longitude - geographicOrigin[0]) * eastPerDegree, (lat - geographicOrigin[1]) * northPerDegree];
}

export function footprintMetrics(coordinates: [number, number][]): { min: Vec2; max: Vec2; center: Vec2; size: Vec2; area: number } {
  const points = coordinates.map(projectGround);
  const min = [0, 1].map((axis) => Math.min(...points.map((p) => p[axis]!))) as Vec2;
  const max = [0, 1].map((axis) => Math.max(...points.map((p) => p[axis]!))) as Vec2;
  const area = Math.abs(points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length]!;
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0)) / 2;
  return { min, max, center: min.map((n, i) => (n + max[i]!) / 2) as Vec2, size: min.map((n, i) => max[i]! - n) as Vec2, area };
}

function plan(coordinates: [number, number][]): Plan {
  const points = coordinates.map((p) => { const [east, north] = projectGround(p); return [east, -north] as Vec2; });
  const area = points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length]!;
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0);
  if (area > 0) points.reverse();
  return points.map((p, i) => line(p, points[(i + 1) % points.length]!));
}

export function createGeographicBuilding(record: GeoBuilding, offset: [number, number] = [0, 0]): BuildingModel {
  if (record.id === "layer3") {
    return createAonGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-crain-communications") {
    return createCrainGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-blue-cross-blue-shield") {
    return createBlueCrossGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-340-on-the-park") {
    return createOnTheParkGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-the-buckingham") {
    return createBuckinghamGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-michigan-plaza-front-tall") {
    return createMillenniumParkPlazaGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-willoughby-tower") {
    return createWilloughbyTowerGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-six-north-michigan") {
    return createSixNorthMichiganGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-six-north-far-east") {
    return createMichiganBoulevardGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-michigan-plaza-front-middle") {
    return createNorthMichigan180GeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-university-club") {
    return createUniversityClubGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-monroe") {
    return createMonroeGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-maclean-center") {
    return createMacleanCenterGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-lakeview") {
    return createLakeViewGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-peoples-gas") {
    return createPeoplesGasGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-200-south-michigan") {
    return createBorgWarnerGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-railway-exchange") {
    return createRailwayExchangeGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-michigan-west-right") {
    return createGageGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-michigan-west-front") {
    return createKeithGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-30-south-michigan") {
    return createAscherGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-chicago-athletic-association") {
    return createChicagoAthleticAssociationGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-office-west-of-aon") {
    return createTwoIllinoisCenterGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-river-plaza") {
    return createRiverPlazaGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-hyatt-regency-west-tower") {
    return createHyattWestTowerGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-heritage-at-millennium-park") {
    return createHeritageGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-kemper") {
    return createKemperGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-michigan-plaza-south-tower") {
    return createMichiganPlazaSouthGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-330-north-wabash") {
    return createNorthWabashGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-one-prudential-plaza") {
    return createOnePrudentialGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-trump-tower-only") {
    return createTrumpGeographicBuilding(record, plan, offset);
  }
  if (record.id === "building-two-prudential-plaza") {
    return createTwoPrudentialGeographicBuilding(record, plan, offset);
  }
  // Every geographic building has a dedicated factory; a record without one
  // fails loudly here rather than silently rendering generic massing.
  throw new Error(`No geographic factory for ${record.id}.`);
}

function lines(points: Vec3[], color: number): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color }));
}

export function createGeographicGround(offset: [number, number] = [0, 0]): { group: THREE.Group; streets: THREE.Group } {
  const group = new THREE.Group();
  group.name = "Geographic reference";
  group.position.set(offset[0], 0, offset[1]);
  // The study rectangle, 100 m squares from 400 m west of Crain to 500 m east and from
  // 850 m south, past the Railway Exchange at Jackson, to 650 m north.
  const grid: Vec3[] = [];
  for (let x = -400; x <= 500; x += 100) grid.push([x, 0.02, -650], [x, 0.02, 850]);
  for (let north = -850; north <= 650; north += 100) grid.push([-400, 0.02, -north], [500, 0.02, -north]);
  group.add(lines(grid, 0x303b3e));
  const streets = new THREE.Group();
  streets.name = "Mapped street centerlines";
  for (const street of geographicStreets) {
    const points: Vec3[] = street.coordinates.map((coordinate) => {
      const [east, north] = projectGround(coordinate);
      return [east, 0.06, -north];
    });
    const segments: Vec3[] = [];
    for (let i = 1; i < points.length; i += 1) {
      // Clip every segment to the study rectangle, retaining crossing segments.
      const a = points[i - 1]!, b = points[i]!;
      let lo = 0, hi = 1;
      for (const [axis, min, max] of [[0, -400, 500], [2, -650, 850]] as [0 | 2, number, number][]) {
        const delta = b[axis] - a[axis];
        if (Math.abs(delta) < 1e-10) { if (a[axis] < min || a[axis] > max) hi = -1; }
        else {
          const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
          lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
        }
      }
      if (lo <= hi) segments.push(...[lo, hi].map((t) => a.map((n, axis) => n + (b[axis]! - n) * t) as Vec3));
    }
    const object = lines(segments, 0xb9a578);
    object.name = street.name;
    streets.add(object);
  }
  group.add(streets);
  const outlines: Vec3[] = [];
  for (const record of geographicBuildings) {
    const points: Vec3[] = record.footprint.coordinates.map((p) => { const [x, y] = projectGround(p); return [x, 0.1, -y]; });
    points.forEach((p, i) => outlines.push(p, points[(i + 1) % points.length]!));
  }
  group.add(lines(outlines, 0x8ed5de));
  return { group, streets };
}
