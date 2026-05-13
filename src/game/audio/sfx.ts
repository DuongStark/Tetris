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
    if (action === "moveLeft" || action === "moveRight" || action === "rotateCW") {
      this.beep(280, 0.025, 0.025, "triangle");
    }
    if (action === "hold") {
      this.sweep(440, 520, 0.04, 0.03, "triangle");
    }
    if (action === "hardDrop") {
      this.beep(80, 0.05, 0.06, "triangle");
      this.beep(160, 0.03, 0.03, "square");
    }
  }

  events(events: GameEvent[]): void {
    const combo = events.find((e): e is Extract<GameEvent, { type: "comboChanged" }> => e.type === "comboChanged");
    const comboCount = combo ? Math.max(0, combo.combo) : 0;

    for (const event of events) {
      if (event.type === "lineCleared") {
        const baseFreq = Math.min(1400, 520 + comboCount * 60);
        if (event.lines === 4) {
          this.chord([baseFreq, baseFreq * 1.25, baseFreq * 1.5], 0.15, 0.08);
        } else {
          this.arpeggio([baseFreq, baseFreq * 1.2, baseFreq * 1.5], 0.04, 0.06, "square");
        }
      }
      if (event.type === "tSpin") {
        this.sweep(900, 400, 0.08, 0.05, "sawtooth");
        this.beep(1200, 0.1, 0.04, "sine");
      }
      if (event.type === "perfectClear") {
        this.arpeggio([523, 659, 784, 1047], 0.08, 0.07, "square");
      }
      if (event.type === "levelUp") {
        this.sweep(400, 1200, 0.2, 0.06, "square");
      }
      if (event.type === "gameOver") {
        this.sweep(400, 60, 0.3, 0.1, "triangle");
      }
    }
  }

  private beep(frequency: number, duration: number, gain: number, type: OscillatorType = "triangle"): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    const now = this.context.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private sweep(startFreq: number, endFreq: number, duration: number, gain: number, type: OscillatorType = "triangle"): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    const now = this.context.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.context.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private chord(frequencies: number[], duration: number, gain: number): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;

    const now = this.context.currentTime;
    const perGain = gain / frequencies.length;
    for (const freq of frequencies) {
      const osc = this.context.createOscillator();
      const amp = this.context.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now);
      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.exponentialRampToValueAtTime(perGain, now + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(amp).connect(this.context.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
  }

  private arpeggio(frequencies: number[], noteLength: number, gain: number, type: OscillatorType = "triangle"): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;

    const now = this.context.currentTime;
    for (let i = 0; i < frequencies.length; i++) {
      const start = now + i * noteLength;
      const osc = this.context.createOscillator();
      const amp = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequencies[i], start);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + noteLength);
      osc.connect(amp).connect(this.context.destination);
      osc.start(start);
      osc.stop(start + noteLength + 0.02);
    }
  }
}
