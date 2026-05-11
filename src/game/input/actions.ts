import type { InputAction } from "../simulation/types";

export const KEY_BINDINGS: Record<string, InputAction> = {
  ArrowLeft: "moveLeft",
  ArrowRight: "moveRight",
  ArrowDown: "softDrop",
  ArrowUp: "rotateCW",
  KeyX: "rotateCW",
  Space: "hardDrop",
  KeyC: "hold",
  ShiftLeft: "hold",
  ShiftRight: "hold",
  KeyP: "pause",
  Escape: "pause"
};
