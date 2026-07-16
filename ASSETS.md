# Assets — GTA VI Mini — Edição de Fã

A ferramenta de geração de imagens não estava disponível neste ambiente, então
todos os assets do manifest (design.md §10) foram produzidos como **SVG
artesanais** (vetoriais, leves, com alpha onde o manifest pedia PNG com alpha).
Referencie no código como `/<arquivo>.svg` (servidos de `public/`).

| Manifest (design.md §10) | Arquivo final | Dimensões (viewBox) | Notas |
|---|---|---|---|
| `hero-skyline.png` | `hero-skyline.svg` | 2400×900 (8:3) | Skyline synthwave em camadas (fundo `#1B0B33`, frente `#07030F`), janelas neon rosa/laranja/teal, letreiros genéricos ("24H", "BAR", "NEON", "MOTEL", "DISCO"), palmeiras nas extremidades, grão via `feTurbulence`, céu transparente (alpha). |
| `gameplay-mock.png` | `gameplay-mock.svg` | 1600×900 (16:9) | Mock de gameplay top-down GTA 1: cruzamento à noite, asfalto `#23232B`, faixas `#F7D154`, zebras, telhados coloridos com contornos neon, carro teal derrapando com marcas de pneu, 2 viaturas com giroflex red/blue + glow, civis, pedestres, palmeiras top-down, poças de luz, vignette. HUD desenhado: 5 estrelas ouro topo-centro, minimapa circular canto inferior esquerdo, `R$ 1.250` verde topo-esquerdo, velocímetro `87 km/h`. |
| `palm-silhouette.png` | `palm-silhouette.svg` | 800×1200 (2:3) | Palmeira única, silhueta `#07030F`, rim light rosa `#FF2E88` nas folhas, tronco curvado, fundo transparente. Espelhar com `transform: scaleX(-1)` nas instâncias da direita. |
| `og-cover.png` | `og-cover.svg` | 1200×630 | Capa social: gradiente pôr do sol, sol synthwave listrado, skyline + palmeiras na base, título "GTA VI MINI" em gradiente rosa→laranja, chip "EDIÇÃO DE FÃ", subtítulo. |
| — (extra, design.md §10 nota final) | `favicon.svg` | 64×64 | Estrela `star-gold` (#FFD60A) sobre `night-950` (#07030F), cantos arredondados. |

Logo, estrelas de procurado, ícones e o sol synthwave do hero são **SVG/CSS em
código** (componentes React), conforme design.md §10.
