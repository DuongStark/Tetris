<div align="center">

# Neon Tetris

### A cyberpunk-themed Tetris with glowing visuals, particle effects, and satisfying synth audio.

[![Play Now](https://img.shields.io/badge/Play-Live%20Demo-ff2bd6?style=for-the-badge)](https://tetris-eosin-mu.vercel.app)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br/>

| Desktop | Mobile |
|---------|--------|
| ![Desktop](docs/screenshot-desktop.png) | ![Mobile](docs/screenshot-mobile.png) |

</div>

---

## Features

| | |
|---|---|
| **Neon Glow Visuals** | Every tetromino radiates its own neon color with multi-layer glow effects |
| **Particle Explosions** | Line clears, hard drops, and locks burst with sparks and light trails |
| **Animated Background** | Drifting star field + scrolling cyberpunk grid create depth and atmosphere |
| **T-Spin Detection** | Full 3-corner T-spin recognition with bonus scoring and purple flash |
| **Perfect Clear** | Clear the entire board for a golden explosion and massive bonus |
| **Combo System** | Chain line clears for escalating multipliers and rising audio pitch |
| **Synth Audio** | Arpeggios, chords, and frequency sweeps — all generated in real-time |
| **Responsive** | Touch controls on mobile, keyboard help panel on desktop |
| **PWA Ready** | Install on any device, play offline |
| **Accessible** | Keyboard-first, ARIA labels, reduced motion support |

---

## How to Play

### Desktop (Keyboard)

| Key | Action |
|-----|--------|
| `←` `→` | Move left / right |
| `↑` or `X` | Rotate clockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` or `Shift` | Hold piece |
| `P` or `Esc` | Pause |

### Mobile

On-screen D-pad for movement, action buttons for rotate and hold.

---

## Scoring

| Action | Points |
|--------|--------|
| Single | 100 x level |
| Double | 300 x level |
| Triple | 500 x level |
| Tetris (4 lines) | 800 x level |
| T-Spin | 400–1600 x level |
| Perfect Clear | 1000 x level |
| Combo | +50 per chain |
| Hard Drop | +2 per cell |
| Soft Drop | +1 per cell |

---

## Tech Stack

- **Phaser 3** — Canvas rendering and particle effects
- **TypeScript** — Strict type safety
- **Vite** — Fast dev server and optimized builds
- **Web Audio API** — Synthesized sound effects (zero audio files)
- **PWA** — Service worker for offline play

---

## Getting Started

```bash
# Clone
git clone https://github.com/DuongStark/Tetris.git
cd Tetris

# Install
npm install

# Dev server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

---

## Live Demo

**[Play Neon Tetris](https://tetris-eosin-mu.vercel.app)**

---

## License

MIT
