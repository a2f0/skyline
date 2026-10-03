import type * as THREE from "./vendor/three-r186.js";
import type { BuildingModel, Vec3 } from "./models/building-kit.js";

export interface FitBox {
  width: number;
  height: number;
}

export interface PlatformOptions {
  width: number;
  depth: number;
  x?: number;
  z?: number;
  color?: number;
}

export interface ShadowCameraOptions {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
}

export interface StudyView {
  azimuth: number;
  polar: number;
  label?: string;
  projection?: "orthographic" | "perspective";
  fit?: FitBox;
  target?: Vec3;
  // A fixed eye distance from the target. The eye then stays put at every
  // viewport, as a photograph's camera does, and the field of view frames the
  // fit box instead of the distance changing to fit it.
  distance?: number;
  // The fit box's centre, right of and above the sightline through the target, in
  // the fit box's units. A perspective frame off the sightline is a lens shift: the
  // eye and its direction stay put, and the orbit still pivots on the target.
  offset?: [number, number];
  // "bottom" holds the fit box's bottom edge on the viewport's where the viewport is
  // taller than the box, as an SVG's xMidYMax meet does, and the spare height goes
  // above it. Perspective views only; the default centres the box.
  align?: "center" | "bottom";
}

export interface StudyLayout {
  models?: BuildingModel[];
  extras?: THREE.Object3D[];
  defaultView?: string;
  target?: Vec3;
  fit?: FitBox;
  platform?: PlatformOptions;
  lightPosition?: Vec3;
  shadowCamera?: ShadowCameraOptions;
  clippingMargin?: number | null;
  views?: Record<string, Partial<StudyView>>;
}

export interface StudyLabel {
  id: string;
  text: string;
  placement?: string;
}
