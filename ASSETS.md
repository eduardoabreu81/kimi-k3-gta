# Assets — GTA VI Mini — Fan Edition

The image-generation tool was not available in this environment, so every
asset from the manifest (design.md §10) was produced as **hand-crafted SVG**
(vector, lightweight, with alpha where the manifest called for a PNG with
transparency). Reference them in code as `/<file>.svg` (served from
`public/`).

| Manifest (design.md §10) | Final file | Dimensions (viewBox) | Notes |
|---|---|---|---|
| `hero-skyline.png` | `hero-skyline.svg` | 2400×900 (8:3) | Layered synthwave skyline (back `#1B0B33`, front `#07030F`), neon pink/orange/teal windows, generic signs ("24H", "BAR", "NEON", "MOTEL", "DISCO"), palm trees at the edges, grain via `feTurbulence`, transparent sky (alpha). |
| `gameplay-mock.png` | `gameplay-mock.svg` | 1600×900 (16:9) | GTA 1 top-down gameplay mock: night intersection, asphalt `#23232B`, `#F7D154` lane markers, crosswalks, colorful rooftops with neon outlines, teal car drifting with tire marks, 2 police cruisers with red/blue light bars + glow, civilian cars, pedestrians, top-down palm trees, light pools, vignette. Drawn HUD: 5 gold stars top-center, circular minimap bottom-left, `R$ 1.250` green top-left, `87 km/h` speedometer. |
| `palm-silhouette.png` | `palm-silhouette.svg` | 800×1200 (2:3) | Single palm tree, `#07030F` silhouette, pink `#FF2E88` rim light on the fronds, curved trunk, transparent background. Mirror with `transform: scaleX(-1)` for right-side instances. |
| `og-cover.png` | `og-cover.svg` + `og-cover.png` | 1200×630 | Social cover: sunset gradient, striped synthwave sun, skyline + palms at the bottom, "GTA VI MINI" title in pink→orange gradient, "EDIÇÃO DE FÃ" chip, subtitle. The **PNG** (rendered from the SVG with the site's Google Fonts) is what `og:image`/`twitter:image` point at — scrapers require raster images and absolute URLs. |
| — (extra, design.md §10 final note) | `favicon.svg` | 64×64 | `star-gold` (#FFD60A) star over `night-950` (#07030F), rounded corners. |

The logo, wanted stars, icons and the hero's synthwave sun are **in-code
SVG/CSS** (React components), per design.md §10.
