import Phaser from "phaser";
import { gameBridge } from "../../game/bridge";
import { KEY_BINDINGS } from "../../game/input/actions";
import { TetrisEngine } from "../../game/simulation/engine";
import { getCells } from "../../game/simulation/pieces";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type ActivePiece,
  type CellPosition,
  type GameEvent,
  type GameState,
  type InputAction
} from "../../game/simulation/types";
import { PIECE_COLORS } from "../../game/simulation/pieces";

export class GameScene extends Phaser.Scene {
  private readonly engine = new TetrisEngine();
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private boardX = 0;
  private boardY = 0;
  private cell = 28;
  private hitStopMs = 0;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x060711);
    this.boardGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics();
    this.createParticleTexture();
    this.scale.on("resize", this.render, this);

    gameBridge.on("action", (event) => this.dispatch(event.detail));
    window.addEventListener("keydown", this.handleKeyboard, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.handleKeyboard);
    });

    this.render();
    gameBridge.publishState(this.engine.getState());
  }

  update(_time: number, delta: number): void {
    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta;
      return;
    }
    const events = this.engine.tick(delta);
    this.handleEvents(events);
    this.render();
  }

  private readonly handleKeyboard = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    event.preventDefault();
    this.dispatch(action);
  };

  private dispatch(action: InputAction): void {
    const before = this.engine.getState().active;
    const ghost = this.engine.getGhostPiece();
    const events = this.engine.dispatch(action);
    const after = this.engine.getState();
    const reduced = this.isReducedMotion();

    if (action === "hardDrop" && events.some((event) => event.type === "pieceLocked")) {
      this.hardDropFx(before, ghost, PIECE_COLORS[before.type], reduced);
    }
    if (action === "rotateCW" && this.pieceChanged(before, after.active)) {
      this.rotateFx(after.active, PIECE_COLORS[after.active.type], reduced);
    }

    this.handleEvents(events);
    this.render();
    gameBridge.publishState(after);
  }

  private handleEvents(events: GameEvent[]): void {
    if (events.length === 0) return;
    const reduced = this.isReducedMotion();
    for (const event of events) {
      if (event.type === "pieceLocked") {
        this.pieceLockFx(event.cells, PIECE_COLORS[event.piece], reduced);
      }
      if (event.type === "lineCleared") {
        this.lineClearFx(event.rows, event.lines, reduced);
      }
      if (event.type === "holdUsed") {
        this.holdFx(PIECE_COLORS[event.active], reduced);
      }
      if (event.type === "tetris" && !reduced) {
        this.cameras.main.flash(90, 255, 43, 214);
      }
      if (event.type === "levelUp" && !reduced) {
        this.cameras.main.flash(80, 255, 230, 109);
        this.cameras.main.zoomTo(1.035, 90, Phaser.Math.Easing.Sine.Out, true, (_camera, progress) => {
          if (progress === 1) this.cameras.main.zoomTo(1, 130);
        });
      }
      if (event.type === "gameOver") {
        this.gameOverFx(reduced);
      }
    }
    gameBridge.publishEvents(events);
    gameBridge.publishState(this.engine.getState());
  }

  private render = (): void => {
    const width = this.scale.width;
    const height = this.scale.height;
    this.cell = Math.floor(Math.min((width - 104) / BOARD_WIDTH, (height - 218) / BOARD_HEIGHT, 34));
    this.cell = Math.max(18, this.cell);
    this.boardX = Math.floor((width - this.cell * BOARD_WIDTH) / 2);
    this.boardY = Math.floor(Math.max(68, height * 0.075));

    const state = this.engine.getState();
    const ghost = this.engine.getGhostPiece();
    const g = this.boardGraphics;
    g.clear();

    this.drawBackdrop(g);
    this.drawBoardCells(g, state);
    this.drawGhost(g, ghost);
    this.drawActive(g, state);
  };

  private drawBackdrop(g: Phaser.GameObjects.Graphics): void {
    const w = BOARD_WIDTH * this.cell;
    const h = BOARD_HEIGHT * this.cell;
    g.fillStyle(0x080a19, 0.86);
    g.fillRoundedRect(this.boardX - 10, this.boardY - 10, w + 20, h + 20, 8);
    g.lineStyle(2, 0x00f5ff, 0.7);
    g.strokeRoundedRect(this.boardX - 10, this.boardY - 10, w + 20, h + 20, 8);
    g.lineStyle(8, 0xff2bd6, 0.09);
    g.strokeRoundedRect(this.boardX - 16, this.boardY - 16, w + 32, h + 32, 10);

    g.lineStyle(1, 0xffffff, 0.055);
    for (let x = 0; x <= BOARD_WIDTH; x += 1) {
      const px = this.boardX + x * this.cell;
      g.lineBetween(px, this.boardY, px, this.boardY + h);
    }
    for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
      const py = this.boardY + y * this.cell;
      g.lineBetween(this.boardX, py, this.boardX + w, py);
    }
  }

  private drawBoardCells(g: Phaser.GameObjects.Graphics, state: GameState): void {
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const piece = state.board[y][x];
        if (piece) {
          this.drawCell(g, x, y, PIECE_COLORS[piece], 1);
        }
      }
    }
  }

  private drawGhost(g: Phaser.GameObjects.Graphics, ghost: GameState["active"]): void {
    for (const cell of getCells(ghost)) {
      if (cell.y >= 0) {
        this.drawCell(g, cell.x, cell.y, PIECE_COLORS[ghost.type], 0.18, true);
      }
    }
  }

  private drawActive(g: Phaser.GameObjects.Graphics, state: GameState): void {
    for (const cell of getCells(state.active)) {
      if (cell.y >= 0) {
        this.drawCell(g, cell.x, cell.y, PIECE_COLORS[state.active.type], 1);
      }
    }
  }

  private drawCell(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number, ghost = false): void {
    const pad = ghost ? Math.max(3, Math.floor(this.cell * 0.15)) : Math.max(1, Math.floor(this.cell * 0.035));
    const px = this.boardX + x * this.cell + pad;
    const py = this.boardY + y * this.cell + pad;
    const size = this.cell - pad * 2;

    if (!ghost) {
      g.fillStyle(color, 0.24 * alpha);
      g.fillRoundedRect(px - 3, py - 3, size + 6, size + 6, 6);
    }
    g.fillStyle(color, ghost ? 0.08 : 0.92 * alpha);
    g.fillRoundedRect(px, py, size, size, 5);
    if (!ghost) {
      g.fillStyle(0xffffff, 0.14 * alpha);
      g.fillRoundedRect(px + 2, py + 2, size - 4, Math.max(4, size * 0.22), 4);
    }
    g.lineStyle(1.5, 0xffffff, ghost ? 0.2 : 0.52 * alpha);
    g.strokeRoundedRect(px + 1, py + 1, size - 2, size - 2, 4);
  }

  private rotateFx(piece: ActivePiece, color: number, reduced: boolean): void {
    if (reduced) return;
    this.piecePulse(piece, color, 0x00f5ff, 150);
    this.sparkAtPiece(piece, color, 14, 150);
  }

  private holdFx(color: number, reduced: boolean): void {
    const active = this.engine.getState().active;
    this.sparkAtPiece(active, color, reduced ? 8 : 18, reduced ? 100 : 220);
    if (!reduced) {
      this.piecePulse(active, color, 0xff2bd6, 180);
    }
  }

  private pieceLockFx(cells: CellPosition[], color: number, reduced: boolean): void {
    if (cells.length === 0) return;
    const visibleCells = cells.filter((cell) => cell.y >= 0);
    if (visibleCells.length === 0) return;

    const g = this.add.graphics().setDepth(3);
    for (const cell of visibleCells) {
      this.drawFxCell(g, cell.x, cell.y, color, 0.58);
    }
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: reduced ? 90 : 170,
      onComplete: () => g.destroy()
    });

    const center = this.cellsCenter(visibleCells);
    this.spawnBurst(center.x, center.y, color, reduced ? 8 : 18, reduced ? 140 : 240);
    if (!reduced) {
      this.cameras.main.shake(45, 0.003);
    }
  }

  private hardDropFx(from: ActivePiece, to: ActivePiece, color: number, reduced: boolean): void {
    if (reduced) return;
    const fromCells = getCells(from).filter((cell) => cell.y >= 0);
    const toCells = getCells(to).filter((cell) => cell.y >= 0);
    if (fromCells.length === 0 || toCells.length === 0) return;

    const g = this.add.graphics().setDepth(2);
    g.lineStyle(Math.max(3, this.cell * 0.12), color, 0.42);
    for (const start of fromCells) {
      const end = toCells.find((cell) => cell.x === start.x) ?? toCells[0];
      const sx = this.boardX + start.x * this.cell + this.cell / 2;
      const sy = this.boardY + start.y * this.cell + this.cell / 2;
      const ex = this.boardX + end.x * this.cell + this.cell / 2;
      const ey = this.boardY + end.y * this.cell + this.cell / 2;
      g.lineBetween(sx, sy, ex, ey);
    }
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      onComplete: () => g.destroy()
    });

    const center = this.cellsCenter(toCells);
    this.spawnBurst(center.x, center.y, color, 28, 300);
    this.cameras.main.shake(80, 0.006);
  }

  private gameOverFx(reduced: boolean): void {
    const overlay = this.add.graphics().setDepth(8);
    overlay.fillStyle(0xff2bd6, reduced ? 0.1 : 0.18);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.lineStyle(reduced ? 4 : 8, 0x00f5ff, 0.75);
    overlay.lineBetween(0, this.boardY + BOARD_HEIGHT * this.cell * 0.5, this.scale.width, this.boardY + BOARD_HEIGHT * this.cell * 0.5);
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: reduced ? 180 : 420,
      onComplete: () => overlay.destroy()
    });
    if (!reduced) {
      this.cameras.main.shake(180, 0.01);
    }
  }

  private piecePulse(piece: ActivePiece, fillColor: number, strokeColor: number, duration: number): void {
    const g = this.add.graphics().setDepth(4);
    for (const cell of getCells(piece)) {
      if (cell.y >= 0) {
        this.drawFxCell(g, cell.x, cell.y, fillColor, 0.18, strokeColor);
      }
    }
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration,
      onComplete: () => g.destroy()
    });
  }

  private drawFxCell(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number, strokeColor = 0xffffff): void {
    const pad = Math.max(1, Math.floor(this.cell * 0.02));
    const px = this.boardX + x * this.cell + pad;
    const py = this.boardY + y * this.cell + pad;
    const size = this.cell - pad * 2;
    g.fillStyle(color, alpha);
    g.fillRoundedRect(px - 3, py - 3, size + 6, size + 6, 6);
    g.lineStyle(3, strokeColor, Math.min(0.9, alpha + 0.28));
    g.strokeRoundedRect(px - 2, py - 2, size + 4, size + 4, 7);
  }

  private sparkAtPiece(piece: ActivePiece, color: number, quantity: number, speed: number): void {
    const cells = getCells(piece).filter((cell) => cell.y >= 0);
    if (cells.length === 0) return;
    const center = this.cellsCenter(cells);
    this.spawnBurst(center.x, center.y, color, quantity, speed);
  }

  private spawnBurst(x: number, y: number, color: number, quantity: number, speed: number): void {
    const emitter = this.add.particles(x, y, "spark", {
      lifespan: 260,
      speed: { min: 40, max: speed },
      angle: { min: 0, max: 360 },
      scale: { start: 0.46, end: 0 },
      quantity,
      tint: color,
      blendMode: "ADD",
      emitting: false
    });
    emitter.explode(quantity);
    this.time.delayedCall(340, () => emitter.destroy());
  }

  private cellsCenter(cells: CellPosition[]): { x: number; y: number } {
    const sum = cells.reduce(
      (acc, cell) => ({
        x: acc.x + this.boardX + cell.x * this.cell + this.cell / 2,
        y: acc.y + this.boardY + cell.y * this.cell + this.cell / 2
      }),
      { x: 0, y: 0 }
    );
    return { x: sum.x / cells.length, y: sum.y / cells.length };
  }

  private pieceChanged(before: ActivePiece, after: ActivePiece): boolean {
    return before.x !== after.x || before.y !== after.y || before.rotation !== after.rotation || before.type !== after.type;
  }

  private isReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private lineClearFx(rows: number[], lines: number, reduced: boolean): void {
    if (!reduced) {
      this.hitStopMs = lines === 4 ? 105 : 65;
      this.cameras.main.shake(lines === 4 ? 160 : 95, lines === 4 ? 0.012 : 0.007);
    }

    this.fxGraphics.clear();
    for (const row of rows) {
      const y = this.boardY + row * this.cell + this.cell / 2;
      this.fxGraphics.lineStyle(lines === 4 ? 8 : 5, lines === 4 ? 0xff2bd6 : 0x00f5ff, 0.9);
      this.fxGraphics.lineBetween(this.boardX, y, this.boardX + BOARD_WIDTH * this.cell, y);
      this.spawnSparkRow(y, lines);
    }

    this.tweens.add({
      targets: this.fxGraphics,
      alpha: 0,
      duration: reduced ? 120 : 280,
      onComplete: () => {
        this.fxGraphics.clear();
        this.fxGraphics.setAlpha(1);
      }
    });
  }

  private spawnSparkRow(y: number, lines: number): void {
    const emitter = this.add.particles(this.boardX + BOARD_WIDTH * this.cell / 2, y, "spark", {
      lifespan: lines === 4 ? 520 : 320,
      speed: { min: 80, max: lines === 4 ? 420 : 260 },
      angle: { min: 0, max: 360 },
      scale: { start: lines === 4 ? 0.95 : 0.65, end: 0 },
      quantity: lines === 4 ? 42 : 22,
      blendMode: "ADD",
      emitting: false
    });
    emitter.explode(lines === 4 ? 80 : 38);
    this.time.delayedCall(lines === 4 ? 620 : 420, () => emitter.destroy());
  }

  private createParticleTexture(): void {
    const spark = this.add.graphics();
    spark.fillStyle(0xffffff, 1);
    spark.fillCircle(5, 5, 5);
    spark.generateTexture("spark", 10, 10);
    spark.destroy();
  }
}
