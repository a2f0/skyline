import type { Vec3 } from "./models/building-kit.js";

const radians = Math.PI / 180;
const minute = 60_000;
const chicago = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" });
const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

function parts(date: Date) {
  const values = Object.fromEntries(chicago.formatToParts(date).map(({ type, value }) => [type, Number(value)]));
  return { year: values["year"]!, month: values["month"]!, day: values["day"]!, hour: values["hour"]!, minute: values["minute"]! };
}

// Chicago's midnight is unambiguous even on clock-change dates. Resolve each end
// separately: those days contain 23 or 25 hours, and both repeated hours are reachable.
function midnight(year: number, month: number, day: number) {
  const wall = Date.UTC(year, month - 1, day);
  let instant = wall;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const p = parts(new Date(instant));
    instant += wall - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  }
  return instant;
}

export function chicagoDay(now: Date) {
  const { year, month, day } = parts(now);
  const start = midnight(year, month, day), end = midnight(year, month, day + 1);
  return {
    start,
    minutes: (end - start) / minute,
    label: new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }).format(now),
  };
}

export const chicagoTime = (date: Date): string => clock.format(date);

// NOAA's general solar-position equations (geometric elevation, no refraction):
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
// An absolute instant and east-positive longitude avoid browser time-zone/DST offsets.
export function solarPosition(date: Date, latitude: number, longitude: number): { elevation: number; direction: Vec3 } {
  const year = date.getUTCFullYear(), start = Date.UTC(year, 0, 1);
  const days = (Date.UTC(year + 1, 0, 1) - start) / 86_400_000;
  const fraction = 2 * Math.PI / days * ((date.getTime() - start) / 86_400_000 - 0.5);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(fraction) - 0.032077 * Math.sin(fraction)
    - 0.014615 * Math.cos(2 * fraction) - 0.040849 * Math.sin(2 * fraction));
  const declination = 0.006918 - 0.399912 * Math.cos(fraction) + 0.070257 * Math.sin(fraction)
    - 0.006758 * Math.cos(2 * fraction) + 0.000907 * Math.sin(2 * fraction)
    - 0.002697 * Math.cos(3 * fraction) + 0.00148 * Math.sin(3 * fraction);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const hour = ((utcMinutes + equation + 4 * longitude) / 4 - 180) * radians;
  const lat = latitude * radians;
  const east = -Math.cos(declination) * Math.sin(hour);
  const north = Math.cos(lat) * Math.sin(declination) - Math.sin(lat) * Math.cos(declination) * Math.cos(hour);
  const up = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hour);
  return { elevation: Math.asin(Math.max(-1, Math.min(1, up))) / radians, direction: [east, up, -north] };
}
