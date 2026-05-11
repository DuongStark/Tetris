import type { GameEvent, GameState, InputAction } from "./simulation/types";

interface BridgeEvents {
  action: CustomEvent<InputAction>;
  state: CustomEvent<GameState>;
  events: CustomEvent<GameEvent[]>;
}

export class GameBridge extends EventTarget {
  send(action: InputAction): void {
    this.dispatchEvent(new CustomEvent("action", { detail: action }));
  }

  publishState(state: GameState): void {
    this.dispatchEvent(new CustomEvent("state", { detail: state }));
  }

  publishEvents(events: GameEvent[]): void {
    if (events.length > 0) {
      this.dispatchEvent(new CustomEvent("events", { detail: events }));
    }
  }

  on<K extends keyof BridgeEvents>(type: K, listener: (event: BridgeEvents[K]) => void): () => void {
    this.addEventListener(type, listener as EventListener);
    return () => this.removeEventListener(type, listener as EventListener);
  }
}

export const gameBridge = new GameBridge();
