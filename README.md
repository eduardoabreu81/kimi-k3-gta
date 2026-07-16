# GTA VI Mini — Edição de Fã 🎮

Mini-game de navegador estilo GTA 1/2 (visão top-down), feito por fãs, 100% em PT-BR.
Cidade aberta à noite, carros roubáveis com drift, polícia com nível de procurado de 0–5 estrelas,
pedestres, minimapa, HUD completo, modo CRT e som sintetizado via WebAudio.

> Paródia não-oficial, sem fins lucrativos. Sem afiliação com Rockstar Games/Take-Two.
> "Grand Theft Auto" e "GTA" são marcas registradas da Take-Two Interactive.

## Jogar

- **WASD / setas** — mover (a pé) / dirigir
- **E** — roubar / sair do carro
- **ESPAÇO** — freio de mão (drift)
- **ESC** — pausar · **M** — mudo · **R** — reiniciar (no game over)
- No celular: joystick virtual + botões na tela

## Rodar local

```bash
npm install
npm run dev      # dev server
npm run build    # gera dist/
npx vite preview # serve o build
```

## Deploy (GitHub Pages)

O workflow `.github/workflows/pages.yml` builda e publica automaticamente.
Após o push: **Settings → Pages → Source: GitHub Actions**. O site sobe em
`https://<usuario>.github.io/kimi-k3-gta/` (assets usam caminhos relativos, funciona em subpath).

## Stack

React 19 + TypeScript + Vite 7 + Tailwind v3 + GSAP + Framer Motion + Lenis.
Jogo em Canvas 2D puro (sem engine), áudio WebAudio procedural, recorde em localStorage.
