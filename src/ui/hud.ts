import { gameBridge } from "../game/bridge";
import { Sfx } from "../game/audio/sfx";
import downIcon from "../game/assets/down.png";
import leftIcon from "../game/assets/left.png";
import rightIcon from "../game/assets/right.png";
import upIcon from "../game/assets/up.png";
import { getShapeCells, PIECE_COLORS } from "../game/simulation/pieces";
import type { GameEvent, GameState, InputAction, PieceType } from "../game/simulation/types";

const PIECE_HEX = Object.fromEntries(
  Object.entries(PIECE_COLORS).map(([piece, color]) => [piece, `#${color.toString(16).padStart(6, "0")}`])
) as Record<PieceType, string>;

const DPAD_ICONS = {
  hardDrop: upIcon,
  moveLeft: leftIcon,
  moveRight: rightIcon,
  softDrop: downIcon,
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
      <div class="mobile-controls" aria-label="Touch controls">
        <div class="aux-controls">
          <button class="orb-button" data-action="pause" aria-label="Pause">Ⅱ</button>
          <button class="orb-button" data-action="rotateCW" aria-label="Rotate clockwise">↻</button>
          <button class="orb-button" data-action="hold" aria-label="Hold piece">⇄</button>
          <button class="orb-button" data-action="restart" aria-label="Restart">↺</button>
          <button class="orb-button" data-ui="sound" aria-label="Toggle sound">♪</button>
        </div>
        <div class="dpad">
          <button class="dpad-button dpad-button--up" data-action="hardDrop" aria-label="Hard drop">
            <img class="dpad-button__icon" src="${DPAD_ICONS.hardDrop}" alt="" draggable="false" />
          </button>
          <button class="dpad-button dpad-button--left" data-action="moveLeft" aria-label="Move left">
            <img class="dpad-button__icon" src="${DPAD_ICONS.moveLeft}" alt="" draggable="false" />
          </button>
          <button class="dpad-button dpad-button--right" data-action="moveRight" aria-label="Move right">
            <img class="dpad-button__icon" src="${DPAD_ICONS.moveRight}" alt="" draggable="false" />
          </button>
          <button class="dpad-button dpad-button--down" data-action="softDrop" aria-label="Soft drop">
            <img class="dpad-button__icon" src="${DPAD_ICONS.softDrop}" alt="" draggable="false" />
          </button>
        </div>
      </div>
    `
  );

  const score = query(root, "[data-ui='score']");
  const level = query(root, "[data-ui='level']");
  const lines = query(root, "[data-ui='lines']");
  const hold = query(root, "[data-ui='hold']");
  const next = query(root, "[data-ui='next']");
  const status = query(root, "[data-ui='status']");
  const combo = query(root, "[data-ui='combo']");
  const sound = query<HTMLButtonElement>(root, "[data-ui='sound']");
  let soundOn = true;

  sound.addEventListener("click", () => {
    soundOn = !soundOn;
    sound.classList.toggle("is-off", !soundOn);
    sound.textContent = soundOn ? "♪" : "♪̸";
    sfx.setEnabled(soundOn);
  });

  bindButtons(root, sfx);

  gameBridge.on("state", (event) => {
    const state = event.detail;
    score.textContent = state.score.toLocaleString("en-US");
    level.textContent = String(state.level);
    lines.textContent = String(state.lines);
    status.textContent = statusText(state);
    renderPreview(hold, state.hold);
    renderQueue(next, state.next);
    document.body.dataset.gameStatus = state.status;
  });

  gameBridge.on("events", (event) => {
    sfx.events(event.detail);
    showCombo(combo, event.detail);
    vibrate(event.detail);
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
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const grid = document.createElement("div");
  grid.className = "preview__grid";
  grid.style.setProperty("--piece-color", PIECE_HEX[piece]);

  for (const cell of cells) {
    const block = document.createElement("i");
    block.style.gridColumn = String(cell.x - minX + 1);
    block.style.gridRow = String(cell.y - minY + 1);
    grid.append(block);
  }
  target.append(grid);
}

function showCombo(target: Element, events: GameEvent[]): void {
  const clear = events.find((event): event is Extract<GameEvent, { type: "lineCleared" }> => event.type === "lineCleared");
  const tetris = events.some((event) => event.type === "tetris");
  const combo = events.find((event): event is Extract<GameEvent, { type: "comboChanged" }> => event.type === "comboChanged");
  if (!clear) return;

  target.textContent = tetris ? "TETRIS" : `+${clear.lines} LINE${clear.lines > 1 ? "S" : ""}`;
  if (combo && combo.combo > 0) {
    target.textContent += `  x${combo.combo + 1}`;
  }
  target.classList.remove("is-showing", "is-tetris");
  void (target as HTMLElement).offsetWidth;
  target.classList.toggle("is-tetris", tetris);
  target.classList.add("is-showing");
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

function query<T extends Element = HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}
