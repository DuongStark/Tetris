import Phaser from "phaser";
import { registerSW } from "virtual:pwa-register";
import { GameScene } from "./phaser/scenes/GameScene";
import { mountHud } from "./ui/hud";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="game-shell">
    <div id="game-container" class="game-canvas" aria-label="Neon Tetris playfield"></div>
    <div id="ui-root" class="ui-root"></div>
  </main>
`;

mountHud(document.querySelector<HTMLElement>("#ui-root") as HTMLElement);

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
    antialias: true,
    pixelArt: false,
    powerPreference: "high-performance"
  },
  input: {
    activePointers: 3
  },
  scene: [GameScene]
});

registerSW({ immediate: true });
