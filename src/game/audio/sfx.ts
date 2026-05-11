import type { GameEvent, InputAction } from "../simulation/types";

export class Sfx {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  action(action: InputAction): void {
    if (action === "moveLeft" || action === "moveRight" || action === "rotateCW" || action === "hold") {
      this.beep(action === "hold" ? 420 : 260, 0.025, 0.025);
    }
    if (action === "hardDrop") {
      this.beep(110, 0.04, 0.05);
    }
  }

  events(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === "lineCleared") {
        this.beep(event.lines === 4 ? 880 : 620, 0.08, event.lines === 4 ? 0.12 : 0.08);
      }
      if (event.type === "levelUp") {
        this.beep(980, 0.08, 0.1);
      }
      if (event.type === "gameOver") {
        this.beep(82, 0.2, 0.12);
      }
    }
  }

  private beep(frequency: number, duration: number, gain: number): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    const now = this.context.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
