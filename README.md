# GTA VI Mini — Fan Edition 🎮

A fan-made, browser-based mini-game inspired by the classic top-down GTA 1/2 era.
Open night city, stealable cars with drift physics, a police wanted system (0–5 stars),
**delivery missions**, pedestrians, minimap, full HUD, CRT mode, and 100% synthesized
WebAudio sound — no installs, no downloads, straight from the browser.

> **Unofficial, non-profit fan parody.** Not affiliated with Rockstar Games or Take-Two.
> "Grand Theft Auto" and "GTA" are registered trademarks of Take-Two Interactive.

**Play it live:** https://eduardoabreu81.github.io/kimi-k3-gta/

## Features

- 🌃 **Open top-down city at night** — three districts, neon signs, projected shadows,
  beaches, palm trees, and a synthwave vibe
- 🚗 **Stealable cars** — drift physics, handbrake turns, coasting when you bail out
  mid-drive (up to 90 km/h), wrecks, and traffic AI
- 👮 **Wanted system (0–5 stars)** — police cruisers chase, ram, and shoot; evade line
  of sight to cool down; flashing red/blue edge glow at high heat
- 📦 **Delivery missions** — every stolen car generates a job: drive to the gold marker,
  park inside the zone, get paid (R$ 500 + R$ 150 per wanted star) and cool off (−1 star).
  Steal → deliver → repeat
- 🧍 **Pedestrians** — cute little citizens (hair, skin, outfits, swinging arms and legs)
  who panic and scatter when you drive like a maniac
- 🗺️ **Full HUD** — circular minimap with live blips, wanted stars, mission objective
  pill, speedometer, cash, timer, contextual hints
- 📱 **Mobile-ready** — virtual joystick + on-screen buttons, rotate hint, 44px touch
  targets, safe-area aware
- 🌐 **EN / PT-BR** — one-click language toggle (English by default)
- 📺 **CRT mode** — scanlines and vignette for that retro monitor feel
- 🔊 **Procedural audio** — engine, sirens, pickups, crashes and UI, all synthesized
  live via WebAudio (no audio files)
- 💾 **Persistent records** — best score, best time, and best cash saved locally

## Controls

| Input | Action |
| --- | --- |
| **WASD / arrows** | Move (on foot) / drive |
| **E** | Steal / exit car |
| **SPACE** | Handbrake (drift) |
| **SHIFT** | Run (on foot) |
| **ESC** | Pause |
| **M** | Mute |
| **R** | Restart (on game over) |
| **Mobile** | Virtual joystick + action/handbrake buttons |

## Tech stack

- **React 19 + TypeScript + Vite 7**
- **Tailwind CSS v3** + shadcn/ui
- **Canvas 2D** game engine (custom, ~60 fps)
- **WebAudio** procedural sound
- **GSAP + Framer Motion + Lenis** (site animations)
- **react-router** (HashRouter for GitHub Pages)

## Run locally

```bash
npm install
npm run dev        # dev server
npm run build      # outputs dist/
npx vite preview   # serve the production build
```

## Deployment

The site is deployed to **GitHub Pages** from the `gh-pages` branch (built `dist/`
contents at the branch root, plus `404.html` and `.nojekyll`):

```bash
npm run build
# copy dist/* to the gh-pages branch root and push
```

## Credits

Built with [Kimi K3](https://www.kimi.com) (Moonshot AI) — design, engine, UI and
sound, orchestrated as a multi-agent build. Project owner: [@eduardoabreu81](https://github.com/eduardoabreu81).

---

*This is a tribute project made by fans, for fun. If you like open-world crime games,
go play the real thing — Rockstar earned it.*
