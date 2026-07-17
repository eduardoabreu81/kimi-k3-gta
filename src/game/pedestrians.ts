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

/**
 * Bonequinhos vistos de cima: camisa (corpo), pele (rosto/braços), cabelo
 * (metade de trás da cabeça) e calça (perninhas). Paleta §2.3 expandida.
 */
const PALETAS: ReadonlyArray<readonly [string, string, string, string]> = [
  // camisa     pele       cabelo     calça
  ['#FFB347', '#F2C094', '#4A2E1F', '#3D4A6B'], // laranja / cabelo castanho
  ['#C9B8E8', '#E8B08A', '#1E1A26', '#4E4460'], // lilás / cabelo preto
  ['#7CFF6B', '#C98A5E', '#2E1A10', '#37424E'], // verde / pele morena
  ['#FF6BB0', '#F5D7B0', '#7A4A1E', '#5B3A54'], // rosa / loira
  ['#5EC8F2', '#8A5A3B', '#141018', '#2E3A52'], // azul / pele negra
  ['#FFE066', '#F2C094', '#B03A2E', '#3E4A3A'], // amarelo / ruiva
];

export interface Ped {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  shirt: string;
  skin: string;
  hair: string;
  pants: string;
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
    const [shirt, skin, hair, pants] = PALETAS[randInt(0, PALETAS.length - 1)];
    return {
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      angle: rand(0, Math.PI * 2),
      shirt,
      skin,
      hair,
      pants,
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
      const moving = Math.abs(ped.vx) + Math.abs(ped.vy) > 4;
      const bobY = !lying && moving ? Math.sin(ped.bob) * 1.4 : 0;
      ctx.save();
      ctx.globalAlpha = ped.alpha;
      ctx.translate(ped.x, ped.y + bobY);
      // Sombra.
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(1.5, 3.5, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bonequinho top-down (deitado 90° quando derrubado). Frente = +x:
      // perninhas atrás alternando, bracinhos nos lados, rosto na frente,
      // cabelo na metade de trás da cabeça.
      const swing = lying || !moving ? 0 : Math.sin(ped.bob) * 2.2;
      ctx.rotate(lying ? ped.angle + Math.PI / 2 : ped.angle);
      // Perninhas + sapatos (atrás, -x), alternando com o passo.
      ctx.fillStyle = ped.pants;
      ctx.beginPath();
      ctx.roundRect(-6.5 + swing, -4.6, 4.4, 3.6, 1.6);
      ctx.roundRect(-6.5 - swing, 1.0, 4.4, 3.6, 1.6);
      ctx.fill();
      ctx.fillStyle = '#241F33';
      ctx.beginPath();
      ctx.roundRect(-8.6 + swing, -4.6, 2.4, 3.6, 1.2);
      ctx.roundRect(-8.6 - swing, 1.0, 2.4, 3.6, 1.2);
      ctx.fill();
      // Bracinhos (lados, ±y) balançando ao contrário das pernas.
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(-swing * 0.7 + 0.5, -7.2, 2, 0, Math.PI * 2);
      ctx.arc(swing * 0.7 + 0.5, 7.2, 2, 0, Math.PI * 2);
      ctx.fill();
      // Corpinho: ombros largos na perpendicular (camisa).
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 10.5, 12, 4.5);
      ctx.fill();
      // Rosto (pele) na frente (+x) + cabelo cobrindo a metade de trás.
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(1.4, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.hair;
      ctx.beginPath();
      ctx.arc(1.4, 0, 3.7, Math.PI * 0.52, Math.PI * 1.48);
      ctx.closePath();
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
