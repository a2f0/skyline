// The viewer's explicit state machines, tested as transition tables: every legal move, the
// events each state ignores, and the combinations the flags they replaced could hold.
import { describe, expect, test } from "bun:test";
import { sceneTransition, type SceneEvent, type SceneStatus } from "../src/skyline-viewer.js";
import { pressTransition, type CanvasPress, type CanvasPressEvent, type PendingMenu } from "../src/skyline-3d.js";
import type { BuildingModel } from "../src/models/building-kit.js";

describe("the viewer's scene lifecycle", () => {
  const table: [SceneStatus, SceneEvent, SceneStatus][] = [
    ["booting", "ready", "ready"],
    ["booting", "failed", "unavailable"],
    ["booting", "lost", "lost"],
    ["booting", "restored", "booting"],
    ["ready", "lost", "lost"],
    // A scene that has drawn its first frame no longer fails to start.
    ["ready", "ready", "ready"],
    ["ready", "failed", "ready"],
    ["ready", "restored", "ready"],
    // A lost context comes back when the browser restores it, and the scene draws again.
    ["lost", "restored", "ready"],
    ["lost", "lost", "lost"],
    ["lost", "ready", "lost"],
    ["lost", "failed", "lost"],
    // A scene that failed to start is final: a late first frame, failure or context changes nothing.
    ["unavailable", "ready", "unavailable"],
    ["unavailable", "failed", "unavailable"],
    ["unavailable", "lost", "unavailable"],
    ["unavailable", "restored", "unavailable"],
  ];
  test.each(table)("%s + %s -> %s", (status, event, next) => {
    expect(sceneTransition(status, event)).toBe(next);
  });

  test("never reaches a ready scene that is still booting, or an unavailable one that is", () => {
    // The flags this replaced (booting, sceneUnavailable) could also hold booting && !unavailable.
    const reachable = new Set<SceneStatus>(["booting"]);
    for (let round = 0; round < 3; round += 1) {
      for (const status of [...reachable]) for (const event of ["ready", "failed", "lost", "restored"] as const) reachable.add(sceneTransition(status, event));
    }
    expect([...reachable].sort()).toEqual(["booting", "lost", "ready", "unavailable"]);
  });
});

describe("the canvas press behind a building's context menu", () => {
  const menu = (x: number): PendingMenu => ({ building: {} as BuildingModel, x, y: 0 });
  const run = (events: CanvasPressEvent[], press: CanvasPress = { status: "idle" }) => {
    const opened: (PendingMenu | null)[] = [];
    for (const event of events) {
      const next = pressTransition(press, event);
      press = next.press;
      opened.push(next.open);
    }
    return { press, opened };
  };
  const mouseDown: CanvasPressEvent = { type: "down", x: 10, y: 10, mouse: true };
  const touchDown: CanvasPressEvent = { type: "down", x: 10, y: 10, mouse: false };

  test("a mouse press holds its menu until it is released in place", () => {
    const shown = menu(1);
    expect(run([mouseDown, { type: "menu", menu: shown }, { type: "up" }]).opened).toEqual([null, null, shown]);
  });

  test("a menu event after the release opens at once", () => {
    const shown = menu(1);
    expect(run([mouseDown, { type: "up" }, { type: "menu", menu: shown }]).opened).toEqual([null, null, shown]);
    expect(run([{ type: "menu", menu: shown }]).opened).toEqual([shown]);
  });

  test("a mouse drag, before or after the menu event, opens nothing", () => {
    expect(run([mouseDown, { type: "menu", menu: menu(1) }, { type: "move", x: 50, y: 10 }, { type: "up" }]).opened).toEqual([null, null, null, null]);
    expect(run([mouseDown, { type: "move", x: 50, y: 10 }, { type: "up" }, { type: "menu", menu: menu(1) }]).opened).toEqual([null, null, null, null]);
  });

  test("moves of up to 4 pixels are not a drag, and a drag stays one", () => {
    expect(run([mouseDown, { type: "move", x: 14, y: 10 }, { type: "move", x: 13, y: 12 }]).press).toMatchObject({ status: "down", moved: false });
    expect(run([mouseDown, { type: "move", x: 15, y: 10 }, { type: "move", x: 10, y: 10 }]).press).toMatchObject({ status: "down", moved: true });
  });

  test("a touch's long press opens at once, even while it is down", () => {
    const shown = menu(1);
    expect(run([touchDown, { type: "menu", menu: shown }, { type: "up" }]).opened).toEqual([null, shown, null]);
    // Only a mouse drag holds the menu back.
    expect(run([touchDown, { type: "move", x: 50, y: 10 }, { type: "up" }, { type: "menu", menu: shown }]).opened).toEqual([null, null, null, shown]);
  });

  test("a cancelled or dismissed press drops its held menu", () => {
    expect(run([mouseDown, { type: "menu", menu: menu(1) }, { type: "cancel" }, { type: "up" }]).opened).toEqual([null, null, null, null]);
    expect(run([mouseDown, { type: "menu", menu: menu(1) }, { type: "dismiss" }, { type: "up" }]).opened).toEqual([null, null, null, null]);
  });

  test("a later menu event replaces the held one, and a new press starts with none", () => {
    const second = menu(2);
    expect(run([mouseDown, { type: "menu", menu: menu(1) }, { type: "menu", menu: second }, { type: "up" }]).opened).toEqual([null, null, null, second]);
    expect(run([mouseDown, { type: "menu", menu: menu(1) }, mouseDown, { type: "up" }]).opened).toEqual([null, null, null, null]);
  });

  test("a press that is not down ignores moves, releases, cancels and dismissals", () => {
    const idle: CanvasPress = { status: "idle" };
    const released: CanvasPress = { status: "released", mouse: true, moved: true };
    for (const press of [idle, released]) {
      for (const event of [{ type: "move", x: 99, y: 99 }, { type: "up" }, { type: "cancel" }, { type: "dismiss" }] as const) {
        expect(pressTransition(press, event)).toEqual({ press, open: null });
      }
    }
  });

  test("only a press that is down holds a menu", () => {
    // The fields this replaced could hold a pending menu beside a released press.
    const { press } = run([mouseDown, { type: "menu", menu: menu(1) }, { type: "up" }]);
    expect(press).toEqual({ status: "released", mouse: true, moved: false });
    expect(run([mouseDown, { type: "menu", menu: menu(1) }, { type: "cancel" }]).press).toEqual({ status: "released", mouse: true, moved: false });
  });
});
