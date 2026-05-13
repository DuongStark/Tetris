import { getCells, getKickTests, nextRotation, spawnPiece } from "./pieces";
import { RandomBag, type RandomFn } from "./randomBag";
import { gravityInterval, scoreLines } from "./scoring";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  NEXT_QUEUE_SIZE,
  type ActivePiece,
  type Board,
  type GameEvent,
  type GameState,
  type InputAction,
  type PieceType
} from "./types";

export class TetrisEngine {
  private state: GameState;
  private readonly bag: RandomBag;
  private gravityMs = 0;
  private revision = 0;
  private lastMoveWasRotation = false;

  constructor(random?: RandomFn) {
    this.bag = new RandomBag(random);
    this.state = this.createInitialState();
  }

  getState(): GameState {
    return {
      ...this.state,
      board: this.state.board.map((row) => [...row]),
      active: { ...this.state.active },
      next: [...this.state.next]
    };
  }

  getRevision(): number {
    return this.revision;
  }

  getGhostPiece(): ActivePiece {
    let ghost = { ...this.state.active };
    while (!this.collides({ ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }

  dispatch(action: InputAction): GameEvent[] {
    if (action === "restart") {
      this.gravityMs = 0;
      this.state = this.createInitialState();
      this.markChanged();
      return [];
    }

    if (action === "pause") {
      if (this.state.status === "playing") {
        this.state.status = "paused";
        this.markChanged();
      } else if (this.state.status === "paused" || this.state.status === "ready") {
        this.state.status = "playing";
        this.markChanged();
      }
      return [];
    }

    if (this.state.status === "ready") {
      this.state.status = "playing";
      this.markChanged();
    }

    if (this.state.status !== "playing") {
      return [];
    }

    switch (action) {
      case "moveLeft":
        this.tryMove(-1, 0);
        return [];
      case "moveRight":
        this.tryMove(1, 0);
        return [];
      case "softDrop":
        if (this.tryMove(0, 1)) {
          this.state.score += 1;
          return [];
        }
        return this.lockPiece();
      case "rotateCW":
        this.tryRotateCW();
        return [];
      case "hardDrop":
        return this.hardDrop();
      case "hold":
        return this.hold();
      default:
        return [];
    }
  }

  tick(deltaMs: number): GameEvent[] {
    if (this.state.status !== "playing") {
      return [];
    }

    this.gravityMs += deltaMs;
    const events: GameEvent[] = [];
    const interval = gravityInterval(this.state.level, this.state.score);

    while (this.gravityMs >= interval && this.state.status === "playing") {
      this.gravityMs -= interval;
      if (!this.tryMove(0, 1)) {
        events.push(...this.lockPiece());
      }
    }

    return events;
  }

  private createInitialState(): GameState {
    const next: PieceType[] = [];
    for (let i = 0; i < NEXT_QUEUE_SIZE + 1; i += 1) {
      next.push(this.bag.draw());
    }

    const active = spawnPiece(next.shift() as PieceType);

    return {
      board: createEmptyBoard(),
      active,
      hold: null,
      holdUsed: false,
      next,
      score: 0,
      level: 1,
      lines: 0,
      combo: -1,
      status: "ready"
    };
  }

  private ensureQueue(): void {
    while (this.state.next.length < NEXT_QUEUE_SIZE) {
      this.state.next.push(this.bag.draw());
    }
  }

  private spawnNext(resetHold = true): GameEvent[] {
    this.gravityMs = 0;
    this.ensureQueue();
    const next = this.state.next.shift() as PieceType;
    this.state.active = spawnPiece(next);
    if (resetHold) {
      this.state.holdUsed = false;
    }
    this.ensureQueue();
    this.markChanged();

    if (this.collides(this.state.active)) {
      this.state.status = "gameOver";
      return [{ type: "gameOver" }];
    }

    return [];
  }

  private tryMove(dx: number, dy: number): boolean {
    const moved = { ...this.state.active, x: this.state.active.x + dx, y: this.state.active.y + dy };
    if (this.collides(moved)) return false;
    this.state.active = moved;
    this.lastMoveWasRotation = false;
    this.markChanged();
    return true;
  }

  private tryRotateCW(): boolean {
    const from = this.state.active.rotation;
    const to = nextRotation(from);
    for (const kick of getKickTests(this.state.active.type, from, to)) {
      const candidate = {
        ...this.state.active,
        rotation: to,
        x: this.state.active.x + kick.x,
        y: this.state.active.y + kick.y
      };
      if (!this.collides(candidate)) {
        this.state.active = candidate;
        this.lastMoveWasRotation = true;
        this.markChanged();
        return true;
      }
    }
    return false;
  }

  private hardDrop(): GameEvent[] {
    let distance = 0;
    while (this.tryMove(0, 1)) {
      distance += 1;
    }
    this.state.score += distance * 2;
    if (distance > 0) this.markChanged();
    return this.lockPiece();
  }

  private hold(): GameEvent[] {
    if (this.state.holdUsed) return [];

    const current = this.state.active.type;
    if (this.state.hold === null) {
      this.state.hold = current;
      this.state.holdUsed = true;
      this.markChanged();
      const events = this.spawnNext(false);
      return [{ type: "holdUsed", hold: this.state.hold, active: this.state.active.type }, ...events];
    }

    const held = this.state.hold;
    this.state.hold = current;
    this.state.active = spawnPiece(held);
    this.state.holdUsed = true;
    this.markChanged();
    const events: GameEvent[] = [{ type: "holdUsed", hold: this.state.hold, active: this.state.active.type }];
    if (this.collides(this.state.active)) {
      this.state.status = "gameOver";
      events.push({ type: "gameOver" });
    }
    return events;
  }

  private lockPiece(): GameEvent[] {
    const lockedCells = getCells(this.state.active);
    const events: GameEvent[] = [{ type: "pieceLocked", piece: this.state.active.type, cells: lockedCells }];
    this.markChanged();

    for (const cell of lockedCells) {
      if (cell.y < 0) {
        this.state.status = "gameOver";
        events.push({ type: "gameOver" });
        return events;
      }
      this.state.board[cell.y][cell.x] = this.state.active.type;
    }

    const clearedRows = this.findFullRows();
    if (clearedRows.length > 0) {
      const isTSpin = this.detectTSpin();
      this.clearRows(clearedRows);
      this.state.lines += clearedRows.length;
      this.state.score += scoreLines(clearedRows.length, this.state.level);

      if (isTSpin) {
        const tSpinBonus = [400, 800, 1200, 1600][clearedRows.length] ?? 400;
        this.state.score += tSpinBonus * this.state.level;
        events.push({ type: "tSpin", lines: clearedRows.length });
      }

      this.state.combo += 1;
      if (this.state.combo > 0) {
        this.state.score += this.state.combo * 50;
      }
      events.push({ type: "lineCleared", lines: clearedRows.length, rows: clearedRows });
      if (clearedRows.length === 4) {
        events.push({ type: "tetris", rows: clearedRows });
      }
      events.push({ type: "comboChanged", combo: this.state.combo });

      const isPerfectClear = this.state.board.every((row) => row.every((cell) => cell === null));
      if (isPerfectClear) {
        this.state.score += 1000 * this.state.level;
        events.push({ type: "perfectClear", level: this.state.level });
      }
    } else {
      this.state.combo = -1;
      events.push({ type: "comboChanged", combo: this.state.combo });
    }

    const nextLevel = Math.floor(this.state.lines / 10) + 1;
    if (nextLevel > this.state.level) {
      this.state.level = nextLevel;
      events.push({ type: "levelUp", level: this.state.level });
    }

    events.push(...this.spawnNext());
    return events;
  }

  private collides(piece: ActivePiece): boolean {
    return getCells(piece).some((cell) => {
      if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) return true;
      if (cell.y < 0) return false;
      return this.state.board[cell.y][cell.x] !== null;
    });
  }

  private findFullRows(): number[] {
    const rows: number[] = [];
    this.state.board.forEach((row, index) => {
      if (row.every(Boolean)) {
        rows.push(index);
      }
    });
    return rows;
  }

  private detectTSpin(): boolean {
    if (this.state.active.type !== "T" || !this.lastMoveWasRotation) return false;
    const cx = this.state.active.x + 1;
    const cy = this.state.active.y + 1;
    const corners = [
      [cx - 1, cy - 1],
      [cx + 1, cy - 1],
      [cx - 1, cy + 1],
      [cx + 1, cy + 1]
    ];
    let filled = 0;
    for (const [x, y] of corners) {
      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT || (y >= 0 && this.state.board[y][x] !== null)) {
        filled += 1;
      }
    }
    return filled >= 3;
  }

  private clearRows(rows: number[]): void {
    const rowSet = new Set(rows);
    this.state.board = this.state.board.filter((_, index) => !rowSet.has(index));
    while (this.state.board.length < BOARD_HEIGHT) {
      this.state.board.unshift(Array<PieceType | null>(BOARD_WIDTH).fill(null));
    }
  }

  private markChanged(): void {
    this.revision += 1;
  }
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<PieceType | null>(BOARD_WIDTH).fill(null));
}
