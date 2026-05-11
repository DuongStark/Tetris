import Phaser from "phaser";
import { gameBridge } from "../../game/bridge";
import { KEY_BINDINGS } from "../../game/input/actions";
import { TetrisEngine } from "../../game/simulation/engine";
import { getCells } from "../../game/simulation/pieces";
import { BOARD_HEIGHT, BOARD_WIDTH, type GameEvent, type GameState, type InputAction } from "../../game/simulation/types";
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
    const events = this.engine.dispatch(action);
    this.handleEvents(events);
    this.render();
    gameBridge.publishState(this.engine.getState());
  }

  private handleEvents(events: GameEvent[]): void {
    if (events.length === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const event of events) {
      if (event.type === "lineCleared") {
        this.lineClearFx(event.rows, event.lines, reduced);
      }
      if (event.type === "tetris" && !reduced) {
        this.cameras.main.flash(90, 255, 43, 214);
      }
      if (event.type === "levelUp" && !reduced) {
        this.cameras.main.zoomTo(1.035, 90, Phaser.Math.Easing.Sine.Out, true, (_camera, progress) => {
          if (progress === 1) this.cameras.main.zoomTo(1, 130);
        });
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
    const pad = Math.max(2, Math.floor(this.cell * 0.08));
    const px = this.boardX + x * this.cell + pad;
    const py = this.boardY + y * this.cell + pad;
    const size = this.cell - pad * 2;

    if (!ghost) {
      g.fillStyle(color, 0.18 * alpha);
      g.fillRoundedRect(px - 3, py - 3, size + 6, size + 6, 5);
    }
    g.fillStyle(color, ghost ? 0.09 : 0.82 * alpha);
    g.fillRoundedRect(px, py, size, size, 4);
    g.lineStyle(1.5, 0xffffff, ghost ? 0.18 : 0.45 * alpha);
    g.strokeRoundedRect(px + 1, py + 1, size - 2, size - 2, 3);
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
