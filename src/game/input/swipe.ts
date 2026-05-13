import { gameBridge } from "../bridge";

const H_THRESHOLD = 30;
const V_THRESHOLD = 50;
const TAP_MAX_TIME = 200;
const TAP_MAX_DIST = 15;
const HARD_DROP_DIST = 150;
const HARD_DROP_VELOCITY = 0.8;
const DAS_DELAY = 300;
const ARR_DELAY = 120;

export function mountSwipeControls(container: HTMLElement): void {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let lastX = 0;
  let lastY = 0;
  let tracking = false;
  let acted = false;
  let dasTimer = 0;
  let arrTimer = 0;
  let dasDirection: "moveLeft" | "moveRight" | null = null;

  container.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = startX;
    lastY = startY;
    startTime = Date.now();
    tracking = true;
    acted = false;
    clearDas();
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (!tracking) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - lastX;
    const dy = touch.clientY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx >= H_THRESHOLD && absDx > absDy * 0.7) {
      const dir = dx > 0 ? "moveRight" : "moveLeft";
      gameBridge.send(dir);
      lastX = touch.clientX;
      lastY = touch.clientY;
      acted = true;

      if (dasDirection !== dir) {
        clearDas();
        dasDirection = dir;
        dasTimer = window.setTimeout(() => {
          arrTimer = window.setInterval(() => {
            if (dasDirection) gameBridge.send(dasDirection);
          }, ARR_DELAY);
        }, DAS_DELAY);
      }
    } else if (absDy >= V_THRESHOLD && absDy > absDx) {
      if (dy < 0) {
        const elapsed = Date.now() - startTime;
        const velocity = absDy / Math.max(1, elapsed);
        if (velocity > HARD_DROP_VELOCITY) {
          gameBridge.send("hardDrop");
          tracking = false;
          acted = true;
          clearDas();
        }
      } else {
        if (dy > HARD_DROP_DIST) {
          const elapsed = Date.now() - startTime;
          const velocity = dy / Math.max(1, elapsed);
          if (velocity > HARD_DROP_VELOCITY) {
            gameBridge.send("hardDrop");
            tracking = false;
            acted = true;
            clearDas();
          } else {
            gameBridge.send("softDrop");
            startY = touch.clientY;
            acted = true;
          }
        } else {
          gameBridge.send("softDrop");
          startY = touch.clientY;
          acted = true;
        }
      }
    }
  }, { passive: true });

  container.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    clearDas();

    if (acted) return;
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
    const elapsed = Date.now() - startTime;
    if (elapsed < TAP_MAX_TIME && dist < TAP_MAX_DIST) {
      gameBridge.send("rotateCW");
    }
  }, { passive: true });

  container.addEventListener("touchcancel", () => {
    tracking = false;
    clearDas();
  }, { passive: true });

  function clearDas(): void {
    window.clearTimeout(dasTimer);
    window.clearInterval(arrTimer);
    dasTimer = 0;
    arrTimer = 0;
    dasDirection = null;
  }
}
