import { gameBridge } from "../game/bridge";
import { Sfx } from "../game/audio/sfx";
const SVG_ICONS = {
  up: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M7 3h2v2h2v2h2v2h-2v-2h-2v-2h-2v2h-2v2h-2v-2h2v-2h2v-2z" fill="currentColor"/></svg>`,
  down: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M7 13h2v-2h2v-2h2v-2h-2v2h-2v2h-2v-2h-2v-2h-2v2h2v2h2v2z" fill="currentColor"/></svg>`,
  left: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M3 7v2h2v2h2v2h2v-2h-2v-2h-2v-2h2v-2h2v-2h-2v2h-2v2h-2z" fill="currentColor"/></svg>`,
  right: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M13 7v2h-2v2h-2v2h-2v-2h2v-2h2v-2h-2v-2h-2v-2h2v2h2v2h2z" fill="currentColor"/></svg>`,
  rotate: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M10 2h2v2h-2zM12 4h2v2h-2zM12 6v4h-2v2h-4v-2h-2v-4h2v-2h4v2h2zM10 6h-4v-2h-2v4h2v2h4v-2h2v-4h-2v2z" fill="currentColor"/><path d="M10 2h-4v2h4v-2z" fill="currentColor"/></svg>`,
  hold: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M3 3h10v10h-10zM5 5v6h6v-6z" fill="currentColor" fill-rule="evenodd"/><path d="M7 7h2v2h-2z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M4 3h3v10h-3zM9 3h3v10h-3z" fill="currentColor"/></svg>`,
  restart: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M7 2h4v2h2v2h-2v-2h-4v-2zM5 4h2v2h-2zM3 6h2v4h-2zM5 10h2v2h-2zM7 12h4v2h-4zM11 10h2v2h-2zM11 6h2v2h-2z" fill="currentColor"/><path d="M11 1h2v2h-2zM13 3h2v2h-2z" fill="currentColor"/></svg>`,
} as const;
import { getShapeCells, PIECE_COLORS } from "../game/simulation/pieces";
import type { GameEvent, GameState, InputAction, PieceType } from "../game/simulation/types";

const LEVEL_COLORS = [0x00f5ff, 0xff2bd6, 0xffe66d, 0x28ff85, 0x7b61ff, 0xff6b4a, 0x00f5ff, 0xff2bd6, 0xffe66d, 0x28ff85];

const PIECE_HEX = Object.fromEntries(
  Object.entries(PIECE_COLORS).map(([piece, color]) => [piece, `#${color.toString(16).padStart(6, "0")}`])
) as Record<PieceType, string>;

const DPAD_ICONS = {
  hardDrop: SVG_ICONS.up,
  moveLeft: SVG_ICONS.left,
  moveRight: SVG_ICONS.right,
  softDrop: SVG_ICONS.down,
} satisfies Partial<Record<InputAction, string>>;

const ACTION_ICONS = {
  rotateCW: SVG_ICONS.rotate,
  hold: SVG_ICONS.hold,
} satisfies Partial<Record<InputAction, string>>;

export function mountHud(root: HTMLElement): void {
  const sfx = new Sfx();
  root.insertAdjacentHTML(
    "beforeend",
    `
      <div class="hud" aria-live="polite">
        <section class="score-panel">
          <div class="score-panel__score" data-ui="score">0</div>
        </section>
        <section class="level-panel">
          <span>Lv <b data-ui="level">1</b></span>
          <span><b data-ui="lines">0</b> lines</span>
        </section>
        <section class="side-panel side-panel--hold">
          <div class="side-panel__label">Hold</div>
          <div class="preview preview--hold" data-ui="hold"></div>
        </section>
        <section class="side-panel side-panel--next">
          <div class="side-panel__label">Next</div>
          <div class="queue" data-ui="next"></div>
        </section>
      </div>
      <div class="status-chip" data-ui="status">Tap any control</div>
      <div class="combo-pop" data-ui="combo"></div>
      <div class="keys-help">
        <div class="keys-help__title">Controls</div>
        <div class="keys-help__list">
          <span class="keys-help__key">&larr; &rarr;</span><span class="keys-help__action">Move</span>
          <span class="keys-help__key">&uarr; / X</span><span class="keys-help__action">Rotate</span>
          <span class="keys-help__key">&darr;</span><span class="keys-help__action">Soft drop</span>
          <span class="keys-help__key">Space</span><span class="keys-help__action">Hard drop</span>
          <span class="keys-help__key">C / Shift</span><span class="keys-help__action">Hold</span>
          <span class="keys-help__key">P / Esc</span><span class="keys-help__action">Pause</span>
        </div>
      </div>
      <div class="system-controls">
        <button class="orb-button pause-button" data-action="pause" aria-label="Pause"><span class="orb-button__icon">${SVG_ICONS.pause}</span></button>
        <button class="orb-button restart-button" data-action="restart" aria-label="Restart"><span class="orb-button__icon">${SVG_ICONS.restart}</span></button>
        <button class="orb-button settings-button" aria-label="Settings" data-open-settings><span class="orb-button__icon"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M6 1h4v2h2v2h2v4h-2v2h-2v2h-4v-2h-2v-2h-2v-4h2v-2h2v-2zM7 5v1h-1v1h-1v2h1v1h1v1h2v-1h1v-1h1v-2h-1v-1h-1v-1h-2z" fill="currentColor" fill-rule="evenodd"/></svg></span></button>
      </div>
      <div class="settings-panel" data-ui="settings">
        <div class="settings-panel__title">Settings</div>
        <label class="settings-toggle"><input type="checkbox" data-setting="sound" checked><span class="settings-toggle__label">Sound</span></label>
        <label class="settings-toggle"><input type="checkbox" data-setting="ghost" checked><span class="settings-toggle__label">Ghost Piece</span></label>
        <label class="settings-toggle"><input type="checkbox" data-setting="crt" checked><span class="settings-toggle__label">CRT Effects</span></label>
        <label class="settings-toggle"><input type="checkbox" data-setting="bobbing"><span class="settings-toggle__label">Board Float</span></label>
      </div>
      <div class="mobile-controls" aria-label="Touch controls">
        <div class="aux-controls">
          <button class="asset-button action-button action-button--rotate" data-action="rotateCW" aria-label="Rotate clockwise">
            <span class="asset-button__icon">${ACTION_ICONS.rotateCW}</span>
          </button>
          <button class="asset-button action-button action-button--hold" data-action="hold" aria-label="Hold piece">
            <span class="asset-button__icon">${ACTION_ICONS.hold}</span>
          </button>
        </div>
        <div class="dpad">
          <button class="asset-button dpad-button dpad-button--up" data-action="hardDrop" aria-label="Hard drop">
            <span class="asset-button__icon">${DPAD_ICONS.hardDrop}</span>
          </button>
          <button class="asset-button dpad-button dpad-button--left" data-action="moveLeft" aria-label="Move left">
            <span class="asset-button__icon">${DPAD_ICONS.moveLeft}</span>
          </button>
          <button class="asset-button dpad-button dpad-button--right" data-action="moveRight" aria-label="Move right">
            <span class="asset-button__icon">${DPAD_ICONS.moveRight}</span>
          </button>
          <button class="asset-button dpad-button dpad-button--down" data-action="softDrop" aria-label="Soft drop">
            <span class="asset-button__icon">${DPAD_ICONS.softDrop}</span>
          </button>
        </div>
      </div>
      <button class="controls-toggle" aria-label="Toggle controls" data-toggle-controls>?</button>
    `
  );

  const score = query(root, "[data-ui='score']");
  const level = query(root, "[data-ui='level']");
  const lines = query(root, "[data-ui='lines']");
  const hold = query(root, "[data-ui='hold']");
  const holdPanel = query(root, ".side-panel--hold");
  const next = query(root, "[data-ui='next']");
  const status = query(root, "[data-ui='status']");
  const combo = query(root, "[data-ui='combo']");

  bindButtons(root, sfx);
  initControlsToggle(root);
  initSettings(root, sfx);

  const unlockAudio = () => {
    sfx.unlock();
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("touchend", unlockAudio);
  };
  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("touchend", unlockAudio, { passive: true });

  gameBridge.on("action", (event) => {
    sfx.action(event.detail);
  });

  gameBridge.on("state", (event) => {
    const state = event.detail;
    const newScore = state.score.toLocaleString("en-US");
    if (score.textContent !== newScore && score.textContent !== "0") {
      score.classList.remove("is-popping");
      void score.offsetWidth;
      score.classList.add("is-popping");
    }
    score.textContent = newScore;
    level.textContent = String(state.level);
    lines.textContent = String(state.lines);
    status.textContent = statusText(state);
    renderPreview(hold, state.hold);
    renderQueue(next, state.next);
    document.body.dataset.gameStatus = state.status;
    const levelColor = LEVEL_COLORS[(state.level - 1) % LEVEL_COLORS.length];
    document.documentElement.style.setProperty("--level-color", `#${levelColor.toString(16).padStart(6, "0")}`);
  });

  gameBridge.on("events", (event) => {
    sfx.events(event.detail);
    showCombo(combo, event.detail);
    showHoldFlash(holdPanel, event.detail);
    vibrate(event.detail);
    triggerBalatroFx(event.detail, score);
  });
}

function bindButtons(root: HTMLElement, sfx: Sfx): void {
  const repeaters = new Map<HTMLElement, number>();
  const repeatActions = new Set<InputAction>(["moveLeft", "moveRight", "softDrop"]);

  root.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => {
    const action = button.dataset.action as InputAction;
    const send = () => {
      sfx.unlock();
      sfx.action(action);
      gameBridge.send(action);
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.classList.add("is-pressing");
      button.setPointerCapture(event.pointerId);
      send();
      if (repeatActions.has(action)) {
        window.clearInterval(repeaters.get(button));
        const delay = action === "softDrop" ? 48 : 95;
        repeaters.set(button, window.setInterval(send, delay));
      }
    });

    const stop = () => {
      button.classList.remove("is-pressing");
      window.clearInterval(repeaters.get(button));
      repeaters.delete(button);
    };
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
  });
}

function renderQueue(target: Element, queue: PieceType[]): void {
  target.innerHTML = "";
  for (const piece of queue.slice(0, 5)) {
    const item = document.createElement("div");
    item.className = "queue__item";
    renderPreview(item, piece);
    target.append(item);
  }
}

function renderPreview(target: Element, piece: PieceType | null): void {
  target.innerHTML = "";
  target.classList.toggle("preview--empty", piece === null);
  if (!piece) {
    target.textContent = "—";
    return;
  }

  const cells = getShapeCells(piece);
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const maxX = Math.max(...cells.map((c) => c.x));
  const maxY = Math.max(...cells.map((c) => c.y));
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cellSize = 7;
  const gap = 1.5;

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
  grid.style.gap = `${gap}px`;
  grid.style.setProperty("--piece-color", PIECE_HEX[piece]);

  for (const cell of cells) {
    const block = document.createElement("i");
    block.style.display = "block";
    block.style.background = PIECE_HEX[piece];
    block.style.border = "1px solid rgba(255,255,255,0.25)";
    block.style.gridColumn = String(cell.x - minX + 1);
    block.style.gridRow = String(cell.y - minY + 1);
    grid.append(block);
  }

  // Center the grid inside the container
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;";
  wrapper.append(grid);
  target.append(wrapper);
}

function showCombo(target: Element, events: GameEvent[]): void {
  const clear = events.find((event): event is Extract<GameEvent, { type: "lineCleared" }> => event.type === "lineCleared");
  const tetris = events.some((event) => event.type === "tetris");
  const tSpin = events.find((event): event is Extract<GameEvent, { type: "tSpin" }> => event.type === "tSpin");
  const perfectClear = events.some((event) => event.type === "perfectClear");
  const combo = events.find((event): event is Extract<GameEvent, { type: "comboChanged" }> => event.type === "comboChanged");

  if (!clear && !tSpin && !perfectClear) return;

  if (perfectClear) {
    target.textContent = "PERFECT CLEAR";
  } else if (tSpin) {
    const suffix = tSpin.lines > 0 ? ` ${["", "SINGLE", "DOUBLE", "TRIPLE"][tSpin.lines]}` : "";
    target.textContent = `T-SPIN${suffix}`;
  } else if (tetris) {
    target.textContent = "TETRIS";
  } else if (clear) {
    target.textContent = `+${clear.lines} LINE${clear.lines > 1 ? "S" : ""}`;
  }

  if (combo && combo.combo > 0) {
    target.textContent += `  x${combo.combo + 1}`;
  }
  target.classList.remove("is-showing", "is-tetris", "is-tspin", "is-perfect");
  void (target as HTMLElement).offsetWidth;
  target.classList.toggle("is-tetris", tetris && !perfectClear && !tSpin);
  target.classList.toggle("is-tspin", !!tSpin && !perfectClear);
  target.classList.toggle("is-perfect", perfectClear);
  target.classList.add("is-showing");
}

function showHoldFlash(target: Element, events: GameEvent[]): void {
  if (!events.some((event) => event.type === "holdUsed")) return;
  target.classList.remove("is-flashing");
  void (target as HTMLElement).offsetWidth;
  target.classList.add("is-flashing");
}

function vibrate(events: GameEvent[]): void {
  if (!("vibrate" in navigator)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tetris = events.some((event) => event.type === "tetris");
  const lineClear = events.some((event) => event.type === "lineCleared");
  if (tetris) navigator.vibrate([18, 24, 28]);
  else if (lineClear) navigator.vibrate(18);
}

function statusText(state: GameState): string {
  if (state.status === "ready") return "Ready";
  if (state.status === "paused") return "Paused";
  if (state.status === "gameOver") return "Game over";
  return state.combo > 0 ? `Combo ${state.combo + 1}` : "";
}

function initSettings(root: HTMLElement, sfx: Sfx): void {
  const panel = root.querySelector<HTMLElement>("[data-ui='settings']");
  const openBtn = root.querySelector<HTMLElement>("[data-open-settings]");
  if (!panel || !openBtn) return;

  const defaults: Record<string, boolean> = { sound: true, ghost: true, crt: true, bobbing: false };
  const settings: Record<string, boolean> = { ...defaults };

  for (const key of Object.keys(defaults)) {
    const stored = localStorage.getItem(`setting-${key}`);
    if (stored !== null) settings[key] = stored === "true";
  }

  const apply = () => {
    sfx.setEnabled(settings.sound);
    document.body.classList.toggle("no-ghost", !settings.ghost);
    document.body.classList.toggle("no-crt", !settings.crt);
    document.body.classList.toggle("board-bobbing", settings.bobbing);

    panel.querySelectorAll<HTMLInputElement>("input[data-setting]").forEach((input) => {
      const key = input.dataset.setting!;
      input.checked = settings[key];
    });
  };

  apply();

  openBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    panel.classList.toggle("is-open");
  });

  panel.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    const key = input.dataset.setting;
    if (!key) return;
    settings[key] = input.checked;
    localStorage.setItem(`setting-${key}`, String(input.checked));
    apply();
  });

  document.addEventListener("pointerdown", (e) => {
    if (!panel.classList.contains("is-open")) return;
    if (panel.contains(e.target as Node) || openBtn.contains(e.target as Node)) return;
    panel.classList.remove("is-open");
  });
}

function initControlsToggle(root: HTMLElement): void {
  const stored = localStorage.getItem("controls-hidden");
  if (stored === "true") {
    document.body.classList.add("controls-hidden");
  }

  const btn = root.querySelector<HTMLElement>("[data-toggle-controls]");
  if (!btn) return;
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const hidden = document.body.classList.toggle("controls-hidden");
    localStorage.setItem("controls-hidden", String(hidden));
  });
}

function query<T extends Element = HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}

function triggerBalatroFx(events: GameEvent[], scoreEl: Element): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const tetris = events.some((e) => e.type === "tetris");
  const tSpin = events.some((e) => e.type === "tSpin");
  const perfectClear = events.some((e) => e.type === "perfectClear");
  const levelUp = events.some((e) => e.type === "levelUp");
  const gameOver = events.some((e) => e.type === "gameOver");
  const lineClear = events.some((e) => e.type === "lineCleared");

  const isBigEvent = tetris || tSpin || perfectClear || levelUp || gameOver;

  if (isBigEvent) {
    const aberration = document.querySelector(".aberration-overlay");
    if (aberration) {
      aberration.classList.remove("is-active");
      void (aberration as HTMLElement).offsetWidth;
      aberration.classList.add("is-active");
    }

    const shell = document.querySelector(".game-shell");
    if (shell) {
      shell.classList.remove("is-wobbling");
      void (shell as HTMLElement).offsetWidth;
      shell.classList.add("is-wobbling");
    }
  }

  if (lineClear || isBigEvent) {
    scoreEl.classList.remove("is-bloom");
    void (scoreEl as HTMLElement).offsetWidth;
    scoreEl.classList.add("is-bloom");
  }
}
