<div align="center">

<img src="docs/screenshot-desktop.png" width="100%" alt="Neon Tetris — Desktop" />

# ✦ NEON TETRIS

**Cyberpunk Tetris. Runs in your browser. No install.**

[![Play Now](https://img.shields.io/badge/▶%20PLAY%20NOW-tetris.pixpress.art-ff2bd6?style=for-the-badge&labelColor=0a0e2a)](https://tetris.pixpress.art)
&nbsp;
[![GitHub](https://img.shields.io/badge/Source-GitHub-222?style=for-the-badge&logo=github)](https://github.com/DuongStark/Tetris)
&nbsp;
[![License](https://img.shields.io/badge/License-MIT-7b61ff?style=for-the-badge)](LICENSE)

</div>

---

<div align="center">
<img src="docs/screenshot-mobile.png" width="280" alt="Neon Tetris — Mobile" />
</div>

---

Tetris with a neon/cyberpunk coat of paint. CRT scanlines, chromatic aberration, vignette — inspired by Balatro's visual style. Every sound effect is synthesized live via Web Audio API, no audio files bundled. T-spin detection, perfect clear, combo chains. Swipe gestures on mobile with DAS/ARR. Settings menu to toggle everything.

---

## Controls

### Desktop

| Key | Action |
|-----|--------|
| `← →` | Move |
| `↑` / `X` | Rotate |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` / `Shift` | Hold |
| `P` / `Esc` | Pause |

### Mobile

Swipe left/right to move, swipe down to drop, swipe up to hard drop, tap to rotate. On-screen buttons also available.

---

## Scoring

| Move | Points |
|------|--------|
| Single | 100 × level |
| Double | 300 × level |
| Triple | 500 × level |
| Tetris | 800 × level |
| T-Spin | 400–1600 × level |
| Perfect Clear | 1000 × level |
| Combo | +50 per chain |

---

## Stack

[Phaser 3](https://phaser.io) · TypeScript · Vite · Web Audio API · PWA

---

## Run locally

```bash
git clone https://github.com/DuongStark/Tetris.git
cd Tetris
npm install
npm run dev
```

---

## Settings

In-game settings menu (⚙) lets you toggle:
- CRT effects (scanlines, vignette, chromatic aberration)
- Ghost piece
- Board float animation
- Sound

---

MIT © DuongStark
