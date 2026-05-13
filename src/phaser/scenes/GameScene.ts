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

const KEY_REPEAT_ACTIONS = new Set<InputAction>(["moveLeft", "moveRight", "softDrop"]);

const LEVEL_COLORS = [0x00f5ff, 0xff2bd6, 0xffe66d, 0x28ff85, 0x7b61ff, 0xff6b4a, 0x00f5ff, 0xff2bd6, 0xffe66d, 0x28ff85];

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  phase: number;
  drift: number;
}

export class GameScene extends Phaser.Scene {
  private readonly engine = new TetrisEngine();
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private starsGraphics!: Phaser.GameObjects.Graphics;
  private scanlineGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private boardX = 0;
  private boardY = 0;
  private cell = 28;
  private hitStopMs = 0;
  private floatOffset = 0;
  private floatTime = 0;
  private stars: Star[] = [];
  private ghostPulseTime = 0;
  private gridScrollY = 0;
  private unsubscribeAction?: () => void;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x060711);
    this.starsGraphics = this.add.graphics().setDepth(0);
    this.gridGraphics = this.add.graphics().setDepth(0.5);
    this.boardGraphics = this.add.graphics().setDepth(1);
    this.fxGraphics = this.add.graphics().setDepth(5);
    this.scanlineGraphics = this.add.graphics().setDepth(10).setAlpha(0.04);
    this.createParticleTexture();
    this.initStars();
    this.scale.on("resize", this.onResize, this);

    this.unsubscribeAction = gameBridge.on("action", (event) => this.dispatch(event.detail));
    window.addEventListener("keydown", this.handleKeyboard, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeAction?.();
      this.scale.off("resize", this.onResize, this);
      window.removeEventListener("keydown", this.handleKeyboard);
    });

    this.onResize();
    gameBridge.publishState(this.engine.getState());
  }

  update(_time: number, delta: number): void {
    this.floatTime += delta;
    this.ghostPulseTime += delta;
    this.gridScrollY = (this.gridScrollY + delta * 0.015) % 28;
    const newOffset = Math.round(Math.sin(this.floatTime * 0.002) * 3);
    const needsRedraw = newOffset !== this.floatOffset;
    if (needsRedraw) this.floatOffset = newOffset;

    this.drawStars(delta);
    this.drawGrid();

    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta;
      if (needsRedraw) this.renderBoard();
      return;
    }
    const beforeRevision = this.engine.getRevision();
    const events = this.engine.tick(delta);
    this.handleEvents(events);
    if (this.engine.getRevision() !== beforeRevision || needsRedraw) {
      this.renderBoard();
    }
  }

  private readonly handleKeyboard = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    event.preventDefault();
    if (event.repeat && !KEY_REPEAT_ACTIONS.has(action)) return;
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
    this.renderBoard();
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
      if (event.type === "tSpin") {
        this.tSpinFx(reduced);
      }
      if (event.type === "perfectClear") {
        this.perfectClearFx(reduced);
      }
      if (event.type === "levelUp") {
        this.levelUpFx(event.level, reduced);
      }
      if (event.type === "gameOver") {
        this.gameOverFx(reduced);
      }
    }
    gameBridge.publishEvents(events);
    gameBridge.publishState(this.engine.getState());
  }

  private onResize = (): void => {
    this.renderBoard();
    this.drawScanlines();
  };

  private renderBoard = (): void => {
    const width = this.scale.width;
    const height = this.scale.height;
    const topMargin = Math.floor(Math.max(68, height * 0.075));
    const bottomReserve = height < 700 ? 214 : height < 760 ? 204 : 196;
    const availableHeight = Math.max(0, height - topMargin - bottomReserve);
    this.cell = Math.floor(Math.min((width - 104) / BOARD_WIDTH, availableHeight / BOARD_HEIGHT, 34));
    this.cell = Math.max(18, this.cell);
    this.boardX = Math.floor((width - this.cell * BOARD_WIDTH) / 2);
    this.boardY = topMargin + this.floatOffset;

    const state = this.engine.getState();
    const ghost = this.engine.getGhostPiece();
    const g = this.boardGraphics;
    g.clear();

    this.drawBackdrop(g);
    this.drawBoardCells(g, state);
    this.drawGhost(g, ghost);
    this.drawActive(g, state);
  };

  private drawScanlines(): void {
    const g = this.scanlineGraphics;
    g.clear();
    g.lineStyle(1, 0xffffff, 1);
    for (let y = 0; y < this.scale.height; y += 3) {
      g.lineBetween(0, y, this.scale.width, y);
    }
  }

  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();
    const w = this.scale.width;
    const h = this.scale.height;
    const spacing = 28;
    const offset = this.gridScrollY;

    g.lineStyle(1, 0x00f5ff, 0.03);
    for (let y = offset; y < h; y += spacing) {
      g.lineBetween(0, y, w, y);
    }
    for (let x = 0; x < w; x += spacing) {
      g.lineBetween(x, 0, x, h);
    }
  }

  private drawBackdrop(g: Phaser.GameObjects.Graphics): void {
    const w = BOARD_WIDTH * this.cell;
    const h = BOARD_HEIGHT * this.cell;
    const level = this.engine.getState().level;
    const borderColor = LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];

    // Outer glow border
    g.lineStyle(6, borderColor, 0.12);
    g.strokeRect(this.boardX - 20, this.boardY - 20, w + 40, h + 40);
    g.lineStyle(4, borderColor, 0.18);
    g.strokeRect(this.boardX - 16, this.boardY - 16, w + 32, h + 32);

    // Main board fill (frosted glass layers)
    g.fillStyle(0x0a0e2a, 0.92);
    g.fillRect(this.boardX - 10, this.boardY - 10, w + 20, h + 20);
    // Top highlight gradient simulation
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(this.boardX - 10, this.boardY - 10, w + 20, 40);
    g.fillStyle(0xffffff, 0.02);
    g.fillRect(this.boardX - 10, this.boardY + 20, w + 20, 30);
    // Center radial glow
    g.fillStyle(0xffffff, 0.015);
    g.fillRect(this.boardX + w * 0.25, this.boardY + h * 0.3, w * 0.5, h * 0.4);

    // Primary border (level color)
    g.lineStyle(2, borderColor, 0.9);
    g.strokeRect(this.boardX - 10, this.boardY - 10, w + 20, h + 20);
    // Inner highlight line
    g.lineStyle(1, 0xffffff, 0.06);
    g.lineBetween(this.boardX - 8, this.boardY - 8, this.boardX + w + 8, this.boardY - 8);

    // Corner pixel markers
    const cm = 6;
    g.fillStyle(borderColor, 0.7);
    g.fillRect(this.boardX - 10, this.boardY - 10, cm, cm);
    g.fillRect(this.boardX + w + 10 - cm, this.boardY - 10, cm, cm);
    g.fillRect(this.boardX - 10, this.boardY + h + 10 - cm, cm, cm);
    g.fillRect(this.boardX + w + 10 - cm, this.boardY + h + 10 - cm, cm, cm);

    // Grid lines
    g.lineStyle(1, 0xffffff, 0.04);
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
    const pulse = 0.18 + Math.abs(Math.sin(this.ghostPulseTime * 0.004)) * 0.18;
    const color = PIECE_COLORS[ghost.type];
    for (const cell of getCells(ghost)) {
      if (cell.y >= 0) {
        const pad = Math.max(3, Math.floor(this.cell * 0.15));
        const px = this.boardX + cell.x * this.cell + pad;
        const py = this.boardY + cell.y * this.cell + pad;
        const size = this.cell - pad * 2;
        // Fill with piece color at low alpha
        g.fillStyle(color, 0.12 * pulse * 4);
        g.fillRect(px, py, size, size);
        // Neon outline
        g.lineStyle(2, color, 0.35 + pulse * 0.5);
        g.strokeRect(px, py, size, size);
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
    const pad = ghost ? Math.max(3, Math.floor(this.cell * 0.15)) : 1;
    const px = this.boardX + x * this.cell + pad;
    const py = this.boardY + y * this.cell + pad;
    const size = this.cell - pad * 2;

    if (!ghost && !this.isReducedMotion()) {
      for (let i = 3; i >= 1; i--) {
        g.fillStyle(color, 0.06 / i);
        g.fillRect(px - i * 2, py - i * 2, size + i * 4, size + i * 4);
      }
    }

    g.fillStyle(color, ghost ? 0.1 : 0.92 * alpha);
    g.fillRect(px, py, size, size);

    if (!ghost) {
      g.fillStyle(0xffffff, 0.25 * alpha);
      g.fillRect(px, py, size, 2);
      g.fillRect(px, py, 2, size);

      g.fillStyle(0x000000, 0.3 * alpha);
      g.fillRect(px, py + size - 2, size, 2);
      g.fillRect(px + size - 2, py, 2, size);
    }

    g.lineStyle(1, 0xffffff, ghost ? 0.2 : 0.45 * alpha);
    g.strokeRect(px, py, size, size);
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
      // Settle ripple ring
      const minX = Math.min(...visibleCells.map((c) => c.x));
      const maxX = Math.max(...visibleCells.map((c) => c.x));
      const minY = Math.min(...visibleCells.map((c) => c.y));
      const maxY = Math.max(...visibleCells.map((c) => c.y));
      const rx = this.boardX + minX * this.cell - 4;
      const ry = this.boardY + minY * this.cell - 4;
      const rw = (maxX - minX + 1) * this.cell + 8;
      const rh = (maxY - minY + 1) * this.cell + 8;
      const ring = this.add.graphics().setDepth(4);
      ring.lineStyle(2, color, 0.4);
      ring.strokeRect(rx, ry, rw, rh);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        onComplete: () => ring.destroy()
      });
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
    const pad = 1;
    const px = this.boardX + x * this.cell + pad;
    const py = this.boardY + y * this.cell + pad;
    const size = this.cell - pad * 2;
    g.fillStyle(color, alpha);
    g.fillRect(px - 2, py - 2, size + 4, size + 4);
    g.lineStyle(2, strokeColor, Math.min(0.9, alpha + 0.28));
    g.strokeRect(px - 1, py - 1, size + 2, size + 2);
  }

  private sparkAtPiece(piece: ActivePiece, color: number, quantity: number, speed: number): void {
    const cells = getCells(piece).filter((cell) => cell.y >= 0);
    if (cells.length === 0) return;
    const center = this.cellsCenter(cells);
    this.spawnBurst(center.x, center.y, color, quantity, speed);
  }

  private spawnBurst(x: number, y: number, color: number, quantity: number, speed: number): void {
    const budgetedQuantity = this.fxQuantity(quantity);
    const emitter = this.add.particles(x, y, "spark", {
      lifespan: 260,
      speed: { min: 40, max: this.fxSpeed(speed) },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0.2 },
      quantity: budgetedQuantity,
      tint: color,
      blendMode: "ADD",
      emitting: false
    });
    emitter.explode(budgetedQuantity);
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

    // White flash on cleared rows
    const flash = this.add.graphics().setDepth(5);
    for (const row of rows) {
      const y = this.boardY + row * this.cell;
      flash.fillStyle(0xffffff, 0.85);
      flash.fillRect(this.boardX, y, BOARD_WIDTH * this.cell, this.cell);
    }
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: reduced ? 80 : 150,
      onComplete: () => flash.destroy()
    });

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
    const emitQuantity = this.fxQuantity(lines === 4 ? 42 : 22);
    const explodeQuantity = this.fxQuantity(lines === 4 ? 80 : 38);
    const emitter = this.add.particles(this.boardX + BOARD_WIDTH * this.cell / 2, y, "spark", {
      lifespan: lines === 4 ? 520 : 320,
      speed: { min: 80, max: this.fxSpeed(lines === 4 ? 420 : 260) },
      angle: { min: 0, max: 360 },
      scale: { start: lines === 4 ? 2.0 : 1.4, end: 0.2 },
      quantity: emitQuantity,
      blendMode: "ADD",
      emitting: false
    });
    emitter.explode(explodeQuantity);
    this.time.delayedCall(lines === 4 ? 620 : 420, () => emitter.destroy());
  }

  private fxQuantity(quantity: number): number {
    if (this.scale.width <= 480) return Math.max(6, Math.round(quantity * 0.58));
    if (this.scale.width <= 820) return Math.max(8, Math.round(quantity * 0.75));
    return quantity;
  }

  private fxSpeed(speed: number): number {
    if (this.scale.width <= 480) return speed * 0.82;
    if (this.scale.width <= 820) return speed * 0.92;
    return speed;
  }

  private initStars(): void {
    const count = 80;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.scale.width,
        y: Math.random() * this.scale.height,
        size: Math.random() > 0.85 ? 4 : Math.random() > 0.6 ? 3 : 2,
        alpha: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 0.003 + 0.001,
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.3 + 0.1
      });
    }
  }

  private drawStars(delta: number): void {
    const g = this.starsGraphics;
    g.clear();
    const colors = [0x00f5ff, 0xff2bd6, 0xffe66d, 0x7b61ff, 0xffffff];
    const h = this.scale.height;
    for (const star of this.stars) {
      star.y += star.drift * delta * 0.016;
      if (star.y > h) {
        star.y = -star.size;
        star.x = Math.random() * this.scale.width;
      }
      const twinkle = Math.sin(this.floatTime * star.speed + star.phase);
      const a = star.alpha * (0.5 + twinkle * 0.5);
      if (a < 0.05) continue;
      const color = colors[Math.floor((star.phase * 10) % colors.length)];
      g.fillStyle(color, a);
      g.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
      if (star.size >= 4) {
        g.fillStyle(color, a * 0.3);
        g.fillRect(Math.floor(star.x) - 1, Math.floor(star.y) - 1, star.size + 2, star.size + 2);
      }
    }
  }

  private levelUpFx(level: number, reduced: boolean): void {
    const color = LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];
    if (reduced) {
      this.cameras.main.flash(60, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
      return;
    }
    // Horizontal sweep line
    const sweep = this.add.graphics().setDepth(8);
    sweep.fillStyle(color, 0.7);
    sweep.fillRect(0, 0, this.scale.width, 4);
    sweep.setY(-4);
    this.tweens.add({
      targets: sweep,
      y: this.scale.height,
      duration: 400,
      ease: "Quad.easeIn",
      onComplete: () => sweep.destroy()
    });
    // Particle burst from board center
    const cx = this.boardX + (BOARD_WIDTH * this.cell) / 2;
    const cy = this.boardY + (BOARD_HEIGHT * this.cell) / 2;
    this.spawnBurst(cx, cy, color, 36, 350);
    this.cameras.main.flash(60, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  private tSpinFx(reduced: boolean): void {
    const color = 0x7b61ff;
    if (reduced) return;
    const active = this.engine.getState().active;
    const cells = getCells(active).filter((c) => c.y >= 0);
    if (cells.length === 0) return;
    const center = this.cellsCenter(cells);
    // Purple flash on cells
    const g = this.add.graphics().setDepth(4);
    for (const cell of cells) {
      this.drawFxCell(g, cell.x, cell.y, color, 0.5, 0xff2bd6);
    }
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 250,
      onComplete: () => g.destroy()
    });
    this.spawnBurst(center.x, center.y, color, 30, 280);
    this.cameras.main.shake(100, 0.008);
  }

  private perfectClearFx(reduced: boolean): void {
    const color = 0xffe66d;
    if (!reduced) {
      this.cameras.main.flash(120, 255, 230, 109);
      this.cameras.main.shake(180, 0.012);
    }
    const cx = this.boardX + (BOARD_WIDTH * this.cell) / 2;
    const cy = this.boardY + (BOARD_HEIGHT * this.cell) / 2;
    this.spawnBurst(cx, cy, color, reduced ? 20 : 60, reduced ? 200 : 450);
    // Golden overlay
    if (!reduced) {
      const overlay = this.add.graphics().setDepth(8);
      overlay.fillStyle(color, 0.15);
      overlay.fillRect(this.boardX - 10, this.boardY - 10, BOARD_WIDTH * this.cell + 20, BOARD_HEIGHT * this.cell + 20);
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 400,
        onComplete: () => overlay.destroy()
      });
    }
  }

  private createParticleTexture(): void {
    const spark = this.add.graphics();
    spark.fillStyle(0xffffff, 1);
    spark.fillRect(0, 0, 4, 4);
    spark.generateTexture("spark", 4, 4);
    spark.destroy();
  }
}
