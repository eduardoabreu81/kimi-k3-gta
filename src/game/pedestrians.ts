// ============================================================================
// GTA VI Mini — pedestrians.ts
// Pedestres: cápsulas coloridas nas calçadas (game.md §2.2), bobbing de 2px,
// entram em pânico (correm com "!") perto de carro rápido ou crime.
// Atropelamento é cartoon: o ped cai/rola e some — nada de violência gráfica.
// Cap de ~40 simultâneos (game.md §9), com reciclagem fora da tela.
// ============================================================================

import { rand, randInt, chance, dist2 } from './util';
import type { City } from './city';
import type { Car } from './vehicles';
import { carSpeed } from './vehicles';

const MAX_PEDS = 40;
const WALK_SPEED = 52;
const PANIC_SPEED = 168;
const SCARE_RADIUS = 150;

/** Corpo + cabeça (tom mais claro), paleta §2.3. */
const PALETAS = [
  ['#FFB347', '#FFD28A'],
  ['#C9B8E8', '#E3D8F5'],
  ['#7CFF6B', '#B4FFA8'],
  ['#FF6BB0', '#FFA3CD'],
] as const;

export interface Ped {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  body: string;
  head: string;
  state: 'walk' | 'panic' | 'down';
  panicT: number;
  downT: number;
  exclaimT: number;
  wanderT: number;
  bob: number;
  alpha: number;
}

export class PedestrianManager {
  readonly peds: Ped[] = [];
  private readonly city: City;

  constructor(city: City) {
    this.city = city;
  }

  /** Popula/repopula a cidade (spawn a ≥500px do jogador). */
  reset(px: number, py: number): void {
    this.peds.length = 0;
    for (let i = 0; i < MAX_PEDS; i++) this.peds.push(this.spawn(px, py));
  }

  private spawn(px: number, py: number): Ped {
    let p = this.city.randomSidewalkPoint();
    for (let tries = 0; tries < 12 && dist2(p.x, p.y, px, py) < 500 * 500; tries++) {
      p = this.city.randomSidewalkPoint();
    }
    const [body, head] = PALETAS[randInt(0, PALETAS.length - 1)];
    return {
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      angle: rand(0, Math.PI * 2),
      body,
      head,
      state: 'walk',
      panicT: 0,
      downT: 0,
      exclaimT: 0,
      wanderT: rand(0.5, 3),
      bob: rand(0, 6),
      alpha: 1,
    };
  }

  /** Assusta pedestres num raio (crime ou carro rápido passando). */
  scareNear(x: number, y: number, radius = SCARE_RADIUS): number {
    let scared = 0;
    for (const ped of this.peds) {
      if (ped.state !== 'walk') continue;
      if (dist2(ped.x, ped.y, x, y) < radius * radius) {
        ped.state = 'panic';
        ped.panicT = rand(2, 3.5);
        ped.exclaimT = 1;
        scared++;
      }
    }
    return scared;
  }

  /**
   * Atropelamento cartoon: carro a >80px/s tocando um ped → ele cai/rola e
   * some. Retorna quantos foram derrubados neste frame (para o crime).
   */
  runOverCheck(car: Car): number {
    const speed = carSpeed(car);
    if (speed < 80) return 0;
    let hits = 0;
    for (const ped of this.peds) {
      if (ped.state === 'down') continue;
      if (dist2(ped.x, ped.y, car.x, car.y) < 23 * 23) {
        ped.state = 'down';
        ped.downT = 0;
        // Rola para frente/lado na direção do impacto (exagerado e bobo).
        ped.vx = car.vx * 0.45 + rand(-60, 60);
        ped.vy = car.vy * 0.45 + rand(-60, 60);
        hits++;
      }
    }
    return hits;
  }

  update(dt: number, px: number, py: number): void {
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const ped = this.peds[i];
      ped.bob += dt * 8;

      if (ped.state === 'down') {
        // Cai, rola com atrito e desaparece (cartoon, sem violência gráfica).
        ped.downT += dt;
        ped.x += ped.vx * dt;
        ped.y += ped.vy * dt;
        ped.vx *= Math.max(0, 1 - 3.2 * dt);
        ped.vy *= Math.max(0, 1 - 3.2 * dt);
        if (ped.downT > 0.9) ped.alpha = Math.max(0, 1 - (ped.downT - 0.9) / 0.5);
        if (ped.downT > 1.4) this.peds[i] = this.spawn(px, py);
        continue;
      }

      if (ped.state === 'panic') {
        ped.panicT -= dt;
        ped.exclaimT = Math.max(0, ped.exclaimT - dt);
        // Corre para longe do jogador com leve zigue-zague.
        const away = Math.atan2(ped.y - py, ped.x - px) + Math.sin(ped.bob * 0.7) * 0.5;
        ped.vx = Math.cos(away) * PANIC_SPEED;
        ped.vy = Math.sin(away) * PANIC_SPEED;
        ped.angle = away;
        if (ped.panicT <= 0) {
          ped.state = 'walk';
          ped.wanderT = rand(0.5, 2);
        }
      } else {
        // Caminhada tranquila com mudanças de direção ocasionais.
        ped.wanderT -= dt;
        if (ped.wanderT <= 0) {
          ped.wanderT = rand(1.5, 4);
          ped.angle = chance(0.25) ? ped.angle + Math.PI / 2 : rand(0, Math.PI * 2);
        }
        ped.vx = Math.cos(ped.angle) * WALK_SPEED;
        ped.vy = Math.sin(ped.angle) * WALK_SPEED;
      }

      // Move com colisão axis-separated (r≈5).
      const nx = ped.x + ped.vx * dt;
      if (!this.hits(nx, ped.y)) ped.x = nx;
      else ped.angle = rand(0, Math.PI * 2);
      const ny = ped.y + ped.vy * dt;
      if (!this.hits(ped.x, ny)) ped.y = ny;
      else ped.angle = rand(0, Math.PI * 2);

      // Reciclagem: longe demais do jogador → respawna em outra calçada.
      if (dist2(ped.x, ped.y, px, py) > 760 * 760) this.peds[i] = this.spawn(px, py);
    }
  }

  private hits(x: number, y: number): boolean {
    return (
      this.city.hitSolid(x - 5, y - 5) ||
      this.city.hitSolid(x + 5, y - 5) ||
      this.city.hitSolid(x - 5, y + 5) ||
      this.city.hitSolid(x + 5, y + 5)
    );
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (const ped of this.peds) {
      const lying = ped.state === 'down';
      const bobY = !lying && (Math.abs(ped.vx) + Math.abs(ped.vy) > 4) ? Math.sin(ped.bob) * 2 : 0;
      ctx.save();
      ctx.globalAlpha = ped.alpha;
      ctx.translate(ped.x, ped.y + bobY);
      // Sombra.
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(1.5, 3.5, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cápsula 10×16 (deitada 90° quando derrubado).
      ctx.rotate(lying ? ped.angle + Math.PI / 2 : ped.angle);
      ctx.fillStyle = ped.body;
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 16, 5);
      ctx.fill();
      ctx.fillStyle = ped.head;
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // "!" pixel dourado pulando sobre a cabeça (1s) — pânico.
      if (ped.exclaimT > 0) {
        const jump = Math.abs(Math.sin(time * 10)) * 4;
        ctx.save();
        ctx.globalAlpha = ped.alpha;
        ctx.translate(ped.x, ped.y - 20 - jump);
        ctx.fillStyle = '#FFB347';
        ctx.beginPath();
        ctx.roundRect(-5.5, -6, 11, 12, 2);
        ctx.fill();
        ctx.fillStyle = '#1A1A24';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0.5);
        ctx.restore();
      }
    }
  }
}
