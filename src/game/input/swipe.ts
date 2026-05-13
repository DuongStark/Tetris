import { gameBridge } from "../bridge";

const SWIPE_THRESHOLD = 30;
const HARD_DROP_DISTANCE = 150;
const TAP_MAX_TIME = 250;

export function mountSwipeControls(container: HTMLElement): void {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;
  let acted = false;

  container.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    tracking = true;
    acted = false;
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (!tracking || acted) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
      gameBridge.send(dx > 0 ? "moveRight" : "moveLeft");
      startX = touch.clientX;
      startY = touch.clientY;
      acted = true;
    } else if (absDy > SWIPE_THRESHOLD && absDy > absDx) {
      if (dy > 0) {
        if (dy > HARD_DROP_DISTANCE) {
          gameBridge.send("hardDrop");
          acted = true;
        } else {
          gameBridge.send("softDrop");
          startX = touch.clientX;
          startY = touch.clientY;
          acted = true;
        }
      } else {
        gameBridge.send("hardDrop");
        acted = true;
      }
    }
  }, { passive: true });

  container.addEventListener("touchend", () => {
    if (!tracking) return;
    tracking = false;
    if (acted) return;
    const elapsed = Date.now() - startTime;
    if (elapsed < TAP_MAX_TIME) {
      gameBridge.send("rotateCW");
    }
  }, { passive: true });
}
