# Neon Tetris

**A cyberpunk-themed Tetris game with glowing visuals, particle effects, and satisfying audio.**

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Play Now](https://img.shields.io/badge/Play-Live%20Demo-ff2bd6)](https://example.com)

---

## Features

- **Neon Cyberpunk Visuals** — Glowing tetrominos, animated star field, frosted glass board, and level-reactive color themes
- **Particle Effects** — Explosions on line clears, hard drop trails, lock pulses, and level-up sweeps
- **T-Spin Detection** — Full 3-corner T-spin recognition with bonus scoring and purple flash effects
- **Perfect Clear Bonus** — Clear the entire board for a massive golden explosion and 1000x level bonus
- **Combo System** — Chain consecutive line clears for escalating score multipliers and rising audio pitch
- **Responsive Design** — Touch controls on mobile, keyboard help panel on desktop
- **Synthesized Audio** — Arpeggios, chords, and frequency sweeps generated in real-time via Web Audio API
- **Progressive Web App** — Install on any device, play offline
- **Accessibility** — Full keyboard support, ARIA labels, reduced motion support

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

### Mobile (Touch)

Use the on-screen D-pad for movement and action buttons for rotate/hold.

## Tech Stack

- **Phaser 3** — Game framework and canvas rendering
- **TypeScript** — Strict type safety throughout
- **Vite** — Lightning-fast dev server and build tool
- **Web Audio API** — Synthesized sound effects (no audio files)
- **PWA** — Service worker for offline play

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/neon-tetris.git
cd neon-tetris

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

## Scoring

| Action | Points |
|--------|--------|
| Single | 100 x level |
| Double | 300 x level |
| Triple | 500 x level |
| Tetris (4 lines) | 800 x level |
| T-Spin | 400-1600 x level |
| Perfect Clear | 1000 x level |
| Combo | +50 per chain |
| Hard Drop | +2 per cell |
| Soft Drop | +1 per cell |

## License

MIT
