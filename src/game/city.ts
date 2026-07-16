// ============================================================================
// GTA VI Mini — city.ts
// Cidade procedural em grid (Centro neon / Subúrbio / Praia a leste),
// pré-renderizada em offscreen canvas (camada estática) + elementos dinâmicos
// leves desenhados por frame (ondas, neon pulsante, palmeiras com sway).
// Paleta e regras visuais: design.md §2.3 / game.md §2.1.
// ============================================================================

import { rand, randInt, pick, chance, clamp } from './util';

// ── Dimensões do mundo ───────────────────────────────────────────────────────
export const TILE = 32;
export const GRID = 64; // 64×64 tiles
export const SIZE = TILE * GRID; // 2048 px
export const PITCH = 8; // 2 tiles de rua + 6 de quarteirão
export const SAND_X = 1856; // início da areia (leste)
export const WATER_X = 1952; // início da água (sólido)

/** Centros das faixas de rua (ruas ocupam tiles k*8 e k*8+1 → 64px). */
export const ROAD_LINES: number[] = [];
for (let k = 0; k < 8; k++) ROAD_LINES.push(k * 256 + 32);

/** Retorna o centro da faixa de rua mais próxima de uma coordenada. */
export function nearestRoadLine(v: number): number {
  let best = ROAD_LINES[0];
  let bestD = Math.abs(v - best);
  for (let i = 1; i < ROAD_LINES.length; i++) {
    const d = Math.abs(v - ROAD_LINES[i]);
    if (d < bestD) {
      bestD = d;
      best = ROAD_LINES[i];
    }
  }
  return best;
}

// ── Paleta in-game (design.md §2.3) ──────────────────────────────────────────
const ASFALTO = '#23232B';
const OLEO = '#1B1B22';
const FAIXA_CENTRAL = '#F7D154';
const GUIA = '#3F3F4D';
const ZEBRA = 'rgba(232,232,240,0.7)';
const CALCADA = '#3A3A46';
const CALCADA_BORDA = '#2C2C36';
const BASE_CENTRO = '#171A2E';
const GRAMA = '#14301F';
const AREIA = '#8A7052';
const AGUA = '#0B3B5C';
const ONDA = '#2E7BA8';
const NOITE = 'rgba(7,3,15,0.28)';

const TELHADOS = ['#2E3A59', '#4A2E59', '#59362E', '#2E5948', '#3A2A55'] as const;
const TELHADOS_CASA = ['#59362E', '#3A2A55'] as const;
const NEONS = ['#FF2E88', '#00E5C7', '#FFB347'] as const;

/** Escurece um hex em `f` (0..1) — bordas de telhado 20% mais escuras. */
function shade(hex: string, f: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `rgb(${r},${g},${b})`;
}

export type District = 'centro' | 'suburbio' | 'praia';

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
  neon: string | null;
  neonPhase: number;
  details: { kind: 'tank' | 'duct' | 'sky'; x: number; y: number; w: number; h: number }[];
}

interface Palm {
  x: number;
  y: number;
  phase: number;
  scale: number;
}

/**
 * A cidade: gera o layout, pré-renderiza a camada estática (2048×2048) e a
 * base do minimapa (512×512), e responde consultas de colisão e de spawns.
 */
export class City {
  readonly staticLayer: HTMLCanvasElement;
  readonly minimapLayer: HTMLCanvasElement;
  readonly buildings: Building[] = [];
  private readonly palms: Palm[] = [];
  /** Índice espacial: célula 128px → índices de prédios (colisão rápida). */
  private readonly gridIndex: number[][] = [];
  readonly playerSpawn: { x: number; y: number };

  constructor() {
    this.generate();
    this.staticLayer = this.prerender();
    this.minimapLayer = this.prerenderMinimap();
    // Jogador nasce a pé na calçada do Centro (game.md §3 "a-pe").
    this.playerSpawn = { x: 928, y: 848 };
  }

  // ── Geração do layout ──────────────────────────────────────────────────────

  private generate(): void {
    // Quarteirões bi,bj ∈ 0..6 ocupam tiles [b*8+2 .. b*8+7] (192×192 px).
    for (let bi = 0; bi < 7; bi++) {
      for (let bj = 0; bj < 7; bj++) {
        const district = this.districtOfBlock(bi, bj);
        if (district === 'praia') continue; // praia não tem quarteirão
        const bx = (bi * PITCH + 2) * TILE;
        const by = (bj * PITCH + 2) * TILE;
        if (district === 'centro') this.genCentroBlock(bx, by);
        else this.genSuburbioBlock(bx, by);
      }
    }
    // Palmeiras em fileira na praia (calçadão leste) — game.md §2.1.
    for (let y = 70; y < SIZE - 40; y += rand(80, 130)) {
      this.palms.push({ x: rand(1875, 1935), y: y + rand(-14, 14), phase: rand(0, Math.PI * 2), scale: rand(0.85, 1.15) });
    }
    // Algumas palmeiras espalhadas no Centro (praças).
    for (let i = 0; i < 10; i++) {
      const b = pick([2, 3, 4, 5]);
      const c = pick([2, 3, 4, 5]);
      this.palms.push({
        x: (b * PITCH + 2) * TILE + rand(20, 176),
        y: (c * PITCH + 2) * TILE + rand(20, 176),
        phase: rand(0, Math.PI * 2),
        scale: rand(0.7, 0.95),
      });
    }
  }

  districtOfBlock(bi: number, bj: number): District {
    if (bi >= 2 && bi <= 5 && bj >= 2 && bj <= 5) return 'centro';
    return 'suburbio';
  }

  /** Centro: 1 prédio grande ou 2 gêmeos, com neon pulsante na maioria. */
  private genCentroBlock(bx: number, by: number): void {
    const inner = { x: bx + TILE, y: by + TILE, s: 4 * TILE }; // miolo 128×128
    if (chance(0.55)) {
      this.addBuilding(inner.x + 4, inner.y + 4, inner.s - 8, inner.s - 8, true);
    } else {
      const half = inner.s / 2;
      this.addBuilding(inner.x + 4, inner.y + 4, half - 10, inner.s - 8, true);
      this.addBuilding(inner.x + half + 6, inner.y + 4, half - 10, inner.s - 8, true);
    }
  }

  /** Subúrbio: grama + 2 casas baixas (telhados quentes/roxos). */
  private genSuburbioBlock(bx: number, by: number): void {
    const inner = { x: bx + TILE, y: by + TILE, s: 4 * TILE };
    const s = inner.s / 2 - 8; // casas ~56×56
    this.addBuilding(inner.x + rand(2, 10), inner.y + rand(2, 10), s, s, false);
    this.addBuilding(inner.x + inner.s - s - rand(2, 10), inner.y + inner.s - s - rand(2, 10), s, s, false);
  }

  private addBuilding(x: number, y: number, w: number, h: number, centro: boolean): void {
    const roof = centro ? pick(TELHADOS) : pick(TELHADOS_CASA);
    const neon = centro && chance(0.65) ? pick(NEONS) : null;
    const details: Building['details'] = [];
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      const kind = pick(['tank', 'duct', 'sky'] as const);
      const dw = kind === 'tank' ? rand(10, 16) : rand(10, 26);
      const dh = kind === 'tank' ? dw : rand(8, 18);
      details.push({
        kind,
        x: rand(x + 10, x + w - 10 - dw),
        y: rand(y + 10, y + h - 10 - dh),
        w: dw,
        h: dh,
      });
    }
    this.buildings.push({ x, y, w, h, roof, neon, neonPhase: rand(0, Math.PI * 2), details });
  }

  /** Monta o índice espacial de prédios (chamado uma vez no prerender). */
  private buildIndex(): void {
    const cells = Math.ceil(SIZE / 128);
    this.gridIndex.length = 0;
    for (let i = 0; i < cells * cells; i++) this.gridIndex.push([]);
    this.buildings.forEach((b, idx) => {
      const c0x = clamp(Math.floor(b.x / 128), 0, cells - 1);
      const c1x = clamp(Math.floor((b.x + b.w) / 128), 0, cells - 1);
      const c0y = clamp(Math.floor(b.y / 128), 0, cells - 1);
      const c1y = clamp(Math.floor((b.y + b.h) / 128), 0, cells - 1);
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) this.gridIndex[cy * cells + cx].push(idx);
      }
    });
  }

  /** Colisão pontual: água, borda do mundo ou pegada de prédio. */
  hitSolid(x: number, y: number): boolean {
    if (x < 6 || y < 6 || x > SIZE - 6 || y > SIZE - 6) return true;
    if (x >= WATER_X) return true; // água é sólida (ninguém nada nesta cidade)
    const cells = Math.ceil(SIZE / 128);
    const cx = clamp(Math.floor(x / 128), 0, cells - 1);
    const cy = clamp(Math.floor(y / 128), 0, cells - 1);
    const list = this.gridIndex[cy * cells + cx];
    for (let i = 0; i < list.length; i++) {
      const b = this.buildings[list[i]];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  }

  /** Ponto aleatório no centro de uma rua (para tráfego/polícia). */
  randomRoadPoint(minDistFrom = 0, fx = 0, fy = 0, maxDist = 0): { x: number; y: number; vertical: boolean } {
    for (let tries = 0; tries < 24; tries++) {
      const vertical = chance(0.5);
      const line = pick(ROAD_LINES);
      const along = rand(60, SIZE - 60);
      const x = vertical ? line : along;
      const y = vertical ? along : line;
      const d = Math.hypot(x - fx, y - fy);
      if (d >= minDistFrom && (maxDist <= 0 || d <= maxDist)) return { x, y, vertical };
    }
    return { x: ROAD_LINES[4], y: ROAD_LINES[4], vertical: true };
  }

  /** Ponto aleatório na linha central das calçadas de um quarteirão. */
  randomSidewalkPoint(): { x: number; y: number } {
    const bi = randInt(0, 6);
    const bj = randInt(0, 6);
    const bx = (bi * PITCH + 2) * TILE;
    const by = (bj * PITCH + 2) * TILE;
    const per = 4 * 192;
    let t = rand(0, per);
    const off = 16; // centro do tile de calçada
    if (t < 192) return { x: bx + t, y: by + off };
    t -= 192;
    if (t < 192) return { x: bx + 192 - off, y: by + t };
    t -= 192;
    if (t < 192) return { x: bx + 192 - t, y: by + 192 - off };
    t -= 192;
    return { x: bx + off, y: by + 192 - t };
  }

  // ── Pré-render da camada estática (uma única vez — performance §5.3) ──────

  private prerender(): HTMLCanvasElement {
    this.buildIndex();
    const cv = document.createElement('canvas');
    cv.width = SIZE;
    cv.height = SIZE;
    const ctx = cv.getContext('2d')!;

    // Base geral (quarteirões do Centro) + Praia + Subúrbio.
    ctx.fillStyle = BASE_CENTRO;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = AREIA;
    ctx.fillRect(SAND_X, 0, SIZE - SAND_X, SIZE);
    ctx.fillStyle = AGUA;
    ctx.fillRect(WATER_X, 0, SIZE - WATER_X, SIZE);
    // Grãos de areia pontilhados.
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = chance(0.5) ? 'rgba(0,0,0,0.16)' : 'rgba(255,240,210,0.10)';
      ctx.fillRect(rand(SAND_X, WATER_X), rand(0, SIZE), 2, 2);
    }
    // Ruído sutil da água.
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(rand(WATER_X, SIZE), rand(0, SIZE), rand(2, 8), 2);
    }
    // Grama dos quarteirões do Subúrbio.
    for (let bi = 0; bi < 7; bi++) {
      for (let bj = 0; bj < 7; bj++) {
        if (this.districtOfBlock(bi, bj) !== 'suburbio') continue;
        ctx.fillStyle = GRAMA;
        ctx.fillRect((bi * PITCH + 2) * TILE, (bj * PITCH + 2) * TILE, 192, 192);
      }
    }

    // Ruas (todas as faixas de 64px).
    ctx.fillStyle = ASFALTO;
    for (let k = 0; k < 8; k++) {
      ctx.fillRect(k * 256, 0, 64, SIZE);
      ctx.fillRect(0, k * 256, SIZE, 64);
    }
    // Ruído/manchas de óleo/bueiros sobre o asfalto.
    for (let i = 0; i < 900; i++) {
      const p = this.randomRoadPoint();
      ctx.fillStyle = chance(0.5) ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.10)';
      ctx.fillRect(p.x + rand(-30, 30), p.y + rand(-30, 30), rand(1, 3), rand(1, 3));
    }
    for (let i = 0; i < 46; i++) {
      const p = this.randomRoadPoint();
      ctx.fillStyle = OLEO;
      ctx.beginPath();
      ctx.ellipse(p.x + rand(-28, 28), p.y + rand(-28, 28), rand(5, 15), rand(4, 10), rand(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 34; i++) {
      const p = this.randomRoadPoint();
      ctx.fillStyle = OLEO;
      ctx.beginPath();
      ctx.arc(p.x + rand(-24, 24), p.y + rand(-24, 24), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CALCADA_BORDA;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Guias laterais (linhas finas contínuas) e faixas centrais das avenidas.
    ctx.strokeStyle = GUIA;
    ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
      const o = k * 256;
      ctx.beginPath();
      ctx.moveTo(o + 2, 0); ctx.lineTo(o + 2, SIZE);
      ctx.moveTo(o + 62, 0); ctx.lineTo(o + 62, SIZE);
      ctx.moveTo(0, o + 2); ctx.lineTo(SIZE, o + 2);
      ctx.moveTo(0, o + 62); ctx.lineTo(SIZE, o + 62);
      ctx.stroke();
    }
    // Avenidas (índice par) têm faixa central tracejada amarela.
    ctx.strokeStyle = FAIXA_CENTRAL;
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    for (let k = 0; k < 8; k += 2) {
      const c = k * 256 + 32;
      ctx.beginPath();
      ctx.moveTo(c, 0); ctx.lineTo(c, SIZE);
      ctx.moveTo(0, c); ctx.lineTo(SIZE, c);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Calçadas: anel de 1 tile ao redor do miolo de cada quarteirão.
    for (let bi = 0; bi < 7; bi++) {
      for (let bj = 0; bj < 7; bj++) {
        const bx = (bi * PITCH + 2) * TILE;
        const by = (bj * PITCH + 2) * TILE;
        const inner = this.districtOfBlock(bi, bj) === 'centro' ? BASE_CENTRO : GRAMA;
        ctx.fillStyle = CALCADA;
        ctx.fillRect(bx, by, 192, 192);
        ctx.fillStyle = inner;
        ctx.fillRect(bx + TILE, by + TILE, 192 - 2 * TILE, 192 - 2 * TILE);
        ctx.strokeStyle = CALCADA_BORDA;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, 190, 190);
        // Juntinhas dos tiles da calçada.
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        for (let t = 1; t < 6; t++) {
          ctx.beginPath();
          ctx.moveTo(bx + t * TILE, by); ctx.lineTo(bx + t * TILE, by + TILE);
          ctx.moveTo(bx + t * TILE, by + 192 - TILE); ctx.lineTo(bx + t * TILE, by + 192);
          ctx.moveTo(bx, by + t * TILE); ctx.lineTo(bx + TILE, by + t * TILE);
          ctx.moveTo(bx + 192 - TILE, by + t * TILE); ctx.lineTo(bx + 192, by + t * TILE);
          ctx.stroke();
        }
      }
    }

    // Zebras nos cruzamentos do Centro (faixas de rua índice 2..5).
    ctx.fillStyle = ZEBRA;
    for (let a = 2; a <= 5; a++) {
      for (let b = 2; b <= 5; b++) {
        const cx = a * 256;
        const cy = b * 256;
        for (let i = 0; i < 5; i++) {
          // braços verticais da rua vertical (listras horizontais)
          ctx.fillRect(cx + 4, cy - 64 + 6 + i * 12, 56, 6);
          ctx.fillRect(cx + 4, cy + 64 + 6 + i * 12, 56, 6);
          // braços horizontais (listras verticais)
          ctx.fillRect(cx - 64 + 6 + i * 12, cy + 4, 6, 56);
          ctx.fillRect(cx + 64 + 6 + i * 12, cy + 4, 6, 56);
        }
      }
    }

    // Prédios: sombra projetada + telhado + borda + detalhes de rooftop.
    for (const b of this.buildings) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
      ctx.strokeStyle = shade(b.roof, 0.2);
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      for (const d of b.details) {
        if (d.kind === 'tank') {
          ctx.fillStyle = shade(b.roof, 0.22);
          ctx.beginPath();
          ctx.arc(d.x + d.w / 2, d.y + d.h / 2, d.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = shade(b.roof, 0.35);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (d.kind === 'duct') {
          ctx.fillStyle = shade(b.roof, 0.18);
          ctx.fillRect(d.x, d.y, d.w, d.h);
        } else {
          ctx.fillStyle = 'rgba(200,220,255,0.14)';
          ctx.fillRect(d.x, d.y, d.w, d.h);
          ctx.strokeStyle = shade(b.roof, 0.25);
          ctx.lineWidth = 1;
          ctx.strokeRect(d.x, d.y, d.w, d.h);
        }
      }
    }

    // Árvores do Subúrbio (estáticas) — copa verde escura com rim teal suave.
    for (let i = 0; i < 70; i++) {
      const bi = randInt(0, 6);
      const bj = randInt(0, 6);
      if (this.districtOfBlock(bi, bj) !== 'suburbio') continue;
      const x = (bi * PITCH + 2) * TILE + rand(14, 178);
      const y = (bj * PITCH + 2) * TILE + rand(14, 178);
      if (this.hitSolid(x, y)) continue;
      const r = rand(8, 13);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 4, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1E5B3A';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,229,199,0.20)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Sombras das palmeiras da praia (a copa é dinâmica — sway).
    for (const p of this.palms) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(p.x + 5, p.y + 6, 13 * p.scale, 9 * p.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Overlay noturno multiplicado sobre o mapa inteiro (design.md §2.3).
    ctx.fillStyle = NOITE;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Poças de luz quente dos postes (por cima do overlay — continuam quentes).
    const poles: { x: number; y: number }[] = [];
    for (let k = 0; k < 8; k += 2) {
      for (let j = 0; j < 11; j++) {
        poles.push({ x: k * 256 - 8, y: j * 192 + 64 });
        poles.push({ x: k * 256 + 72, y: j * 192 + 160 });
        poles.push({ x: j * 192 + 64, y: k * 256 - 8 });
        poles.push({ x: j * 192 + 160, y: k * 256 + 72 });
      }
    }
    // Postes extras no Centro (mais luz no miolo neon).
    for (let i = 0; i < 26; i++) {
      const p = this.randomRoadPoint();
      if (p.x > 400 && p.x < 1600 && p.y > 400 && p.y < 1600) poles.push({ x: p.x + 40, y: p.y + 40 });
    }
    for (const p of poles) {
      if (p.x < 12 || p.y < 12 || p.x > SIZE - 12 || p.y > SIZE - 12) continue;
      const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 90);
      g.addColorStop(0, 'rgba(255,179,71,0.18)');
      g.addColorStop(1, 'rgba(255,179,71,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 90, p.y - 90, 180, 180);
      ctx.fillStyle = '#55556A';
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }

    return cv;
  }

  /** Base simplificada do minimapa (512×512), redesenhada só na geração. */
  private prerenderMinimap(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 512;
    const ctx = cv.getContext('2d')!;
    const s = 512 / GRID; // 8px por tile
    for (let ty = 0; ty < GRID; ty++) {
      for (let tx = 0; tx < GRID; tx++) {
        const px = tx * TILE;
        let color: string;
        if (px >= WATER_X) color = AGUA;
        else if (px >= SAND_X) color = AREIA;
        else if (tx % PITCH < 2 || ty % PITCH < 2) color = '#3F3F4D';
        else if (tx % PITCH === 2 || ty % PITCH === 2 || tx % PITCH === 7 || ty % PITCH === 7) color = '#3A3A46';
        else {
          const bi = Math.floor(tx / PITCH);
          const bj = Math.floor(ty / PITCH);
          color = this.districtOfBlock(bi, bj) === 'centro' ? '#241431' : GRAMA;
        }
        ctx.fillStyle = color;
        ctx.fillRect(tx * s, ty * s, s, s);
      }
    }
    return cv;
  }

  // ── Camada dinâmica da cidade (ondas, neon, palmeiras) — por frame ────────

  drawDynamic(ctx: CanvasRenderingContext2D, view: { x: number; y: number; w: number; h: number }, time: number, reducedMotion: boolean): void {
    // Ondas da praia: 2 linhas senoidais (período ~2s) — game.md §2.1.
    if (view.x + view.w > WATER_X - 60) {
      ctx.strokeStyle = ONDA;
      ctx.lineWidth = 2;
      for (let line = 0; line < 2; line++) {
        const baseX = WATER_X + 12 + line * 26;
        const phase = time * Math.PI + line * 1.7; // 2s de ciclo
        ctx.globalAlpha = 0.55 - line * 0.2;
        ctx.beginPath();
        const y0 = Math.max(0, view.y - 20);
        const y1 = Math.min(SIZE, view.y + view.h + 20);
        for (let y = y0; y <= y1; y += 16) {
          const x = baseX + Math.sin(y * 0.045 + phase) * 5;
          if (y === y0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Neon de fachada pulsante (opacity 0.5↔1, ~1.6s, defasado por prédio).
    for (const b of this.buildings) {
      if (!b.neon) continue;
      if (b.x > view.x + view.w || b.x + b.w < view.x || b.y > view.y + view.h || b.y + b.h < view.y) continue;
      const pulse = reducedMotion ? 0.8 : 0.5 + 0.5 * (0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 1.6 + b.neonPhase));
      ctx.save();
      ctx.globalAlpha = clamp(pulse, 0.5, 1);
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = 2;
      ctx.shadowColor = b.neon;
      ctx.shadowBlur = 7;
      ctx.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3);
      ctx.restore();
    }

    // Palmeiras com sway (±2°, 3s, defasagem por árvore) — desliga com reduced-motion.
    for (const p of this.palms) {
      if (p.x < view.x - 40 || p.x > view.x + view.w + 40 || p.y < view.y - 40 || p.y > view.y + view.h + 40) continue;
      const sway = reducedMotion ? 0 : Math.sin((time * Math.PI * 2) / 3 + p.phase) * 0.035;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(sway);
      ctx.scale(p.scale, p.scale);
      // 7 folhas radiais.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + p.phase;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = '#1E5B3A';
        ctx.beginPath();
        ctx.ellipse(8, 0, 9, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,229,199,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#163F29';
      ctx.beginPath();
      ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
