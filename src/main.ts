import Phaser from "phaser";
import { registerSW } from "virtual:pwa-register";
import { inject } from "@vercel/analytics";
import { GameScene } from "./phaser/scenes/GameScene";
import { mountHud } from "./ui/hud";
import { mountSwipeControls } from "./game/input/swipe";
import "./styles.css";

inject();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}

const preventBrowserSelection = (event: Event) => event.preventDefault();
document.addEventListener("selectstart", preventBrowserSelection);
document.addEventListener("contextmenu", preventBrowserSelection);
document.addEventListener("dblclick", preventBrowserSelection, { passive: false });
document.addEventListener("gesturestart", preventBrowserSelection, { passive: false } as AddEventListenerOptions);
document.addEventListener("gesturechange", preventBrowserSelection, { passive: false } as AddEventListenerOptions);
document.addEventListener("gestureend", preventBrowserSelection, { passive: false } as AddEventListenerOptions);
document.addEventListener("touchend", preventBrowserSelection, { passive: false });

app.innerHTML = `
  <main class="game-shell">
    <div id="game-container" class="game-canvas" aria-label="Neon Tetris playfield"></div>
    <div id="ui-root" class="ui-root"></div>
  </main>
  <div class="crt-overlay" aria-hidden="true"></div>
  <div class="vignette-overlay" aria-hidden="true"></div>
  <div class="aberration-overlay" aria-hidden="true"></div>
`;

mountHud(document.querySelector<HTMLElement>("#ui-root") as HTMLElement);
mountSwipeControls(document.querySelector<HTMLElement>("#game-container") as HTMLElement);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#060711",
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: "game-container",
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    powerPreference: "high-performance"
  },
  input: {
    activePointers: 3
  },
  scene: [GameScene]
});

registerSW({ immediate: true });
