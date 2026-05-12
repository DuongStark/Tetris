import { describe, expect, it } from "vitest";
import { RandomBag } from "./randomBag";
import { TetrisEngine } from "./engine";
import { PIECES } from "./pieces";
import { gravityInterval } from "./scoring";
import { BOARD_WIDTH, type BoardCell, type GameState, type PieceType } from "./types";

describe("RandomBag", () => {
  it("emits every piece once per bag", () => {
    const bag = new RandomBag(() => 0);
    const first = Array.from({ length: 7 }, () => bag.draw()).sort();
    const second = Array.from({ length: 7 }, () => bag.draw()).sort();

    expect(first).toEqual([...PIECES].sort());
    expect(second).toEqual([...PIECES].sort());
  });
});

describe("Scoring", () => {
  it("accelerates gravity as score increases", () => {
    expect(gravityInterval(1, 0)).toBe(1000);
    expect(gravityInterval(1, 2500)).toBe(965);
    expect(gravityInterval(1, 10000)).toBe(860);
    expect(gravityInterval(12, 50000)).toBe(70);
  });
});

describe("TetrisEngine", () => {
  it("allows SRS wall kicks when rotating near a wall", () => {
    const engine = new TetrisEngine(() => 0);
    const state = mutableState(engine);
    state.status = "playing";
    state.active = { type: "T", x: -1, y: 5, rotation: 0 };

    engine.dispatch("rotateCW");

    expect(engine.getState().active.rotation).toBe(1);
    expect(engine.getState().active.x).toBeGreaterThanOrEqual(-1);
  });

  it("clears lines and scores modern line values", () => {
    const engine = new TetrisEngine(() => 0);
    const state = mutableState(engine);
    state.status = "playing";
    state.active = { type: "O", x: 3, y: 18, rotation: 0 };
    state.board[18] = filledRowExcept([4, 5]);
    state.board[19] = filledRowExcept([4, 5]);

    const events = engine.dispatch("softDrop");
    const next = engine.getState();

    expect(events.some((event) => event.type === "lineCleared" && event.lines === 2)).toBe(true);
    expect(next.lines).toBe(2);
    expect(next.score).toBe(300);
  });

  it("supports hold, swap, and one hold per falling piece", () => {
    const engine = new TetrisEngine(() => 0);
    const first = engine.getState().active.type;

    const holdEvents = engine.dispatch("hold");
    const afterHold = engine.getState();
    const activeAfterHold = afterHold.active.type;

    expect(holdEvents.some((event) => event.type === "holdUsed")).toBe(true);
    expect(afterHold.hold).toBe(first);
    expect(afterHold.holdUsed).toBe(true);

    engine.dispatch("hold");
    expect(engine.getState().active.type).toBe(activeAfterHold);

    engine.dispatch("hardDrop");
    expect(engine.getState().holdUsed).toBe(false);

    engine.dispatch("hold");
    expect(engine.getState().active.type).toBe(first);
  });

  it("detects game over when a new piece cannot spawn", () => {
    const engine = new TetrisEngine(() => 0);
    const state = mutableState(engine);
    state.status = "playing";
    state.active = { type: "O", x: 3, y: -2, rotation: 0 };
    state.board[0] = Array<PieceType>(BOARD_WIDTH).fill("Z");

    const events = engine.dispatch("hardDrop");

    expect(events.some((event) => event.type === "gameOver")).toBe(true);
    expect(engine.getState().status).toBe("gameOver");
  });

  it("resets gravity timing after restart and piece spawn", () => {
    const engine = new TetrisEngine(() => 0);
    const interval = gravityInterval(1);

    engine.dispatch("pause");
    engine.tick(interval - 1);
    engine.dispatch("restart");
    engine.dispatch("pause");
    const yAfterRestart = engine.getState().active.y;
    engine.tick(1);
    expect(engine.getState().active.y).toBe(yAfterRestart);

    engine.tick(interval - 1);
    engine.dispatch("hardDrop");
    const yAfterSpawn = engine.getState().active.y;
    engine.tick(1);
    expect(engine.getState().active.y).toBe(yAfterSpawn);
  });

  it("tracks revisions for render-worthy state changes", () => {
    const engine = new TetrisEngine(() => 0);
    const initial = engine.getRevision();

    engine.dispatch("pause");
    expect(engine.getRevision()).toBeGreaterThan(initial);

    const afterStart = engine.getRevision();
    engine.tick(999);
    expect(engine.getRevision()).toBe(afterStart);

    engine.tick(1);
    expect(engine.getRevision()).toBeGreaterThan(afterStart);
  });
});

function mutableState(engine: TetrisEngine): GameState {
  return (engine as unknown as { state: GameState }).state;
}

function filledRowExcept(emptyXs: number[]): BoardCell[] {
  return Array.from({ length: BOARD_WIDTH }, (_, x) => (emptyXs.includes(x) ? null : "I"));
}
