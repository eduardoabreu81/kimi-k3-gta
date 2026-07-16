// ============================================================================
// GTA VI Mini — police.ts
// Viaturas: spawn por nível de procurado, IA de perseguição com wobble e
// rubber-band, giroflex vermelho/azul a 4 Hz com glow no asfalto (a assinatura
// visual do jogo), tiros cartoon a partir de 3★ e lógica de DETIDO.
// ============================================================================

import { clamp, rand, chance, dist2, wrapAngle } from './util';
import { nearestRoadLine } from './city';
import type { City } from './city';
import type { Car } from './vehicles';
import { stepCar, moveCar, carSpeed, drawCar } from './vehicles';
import { POLICE_SIGHT } from './wanted';

/** Viaturas ativas por nível de procurado (cap 8 — game.md §9). */
const COPS_BY_LEVEL = [0, 2, 3, 4, 6, 8] as const;

export interface CopCar {
  car: Car;
  shootT: number;
  stuckT: number;
  stuckCount: number;
  reverseT: number;
  wobble: number;
  lastSeenX: number;
  lastSeenY: number;
}

export interface PoliceUpdate {
  city: City;
  px: number;
  py: number;
  playerSpeed: number;
  wanted: number;
  time: number;
  /** Disparo cartoon: engine desenha o tracer, toca o som e aplica dano. */
  onShoot: (fromX: number, fromY: number, hit: boolean) => void;
}

let copId = 10000;

/** Escolhe o ângulo candidato mais próximo do desejado que não bate em prédio. */
function clearHeading(car: Car, city: City, desired: number): number {
  const offsets = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, Math.PI];
  for (const off of offsets) {
    const a = desired + off;
    if (!city.hitSolid(car.x + Math.cos(a) * 64, car.y + Math.sin(a) * 64)) return a;
  }
  return desired;
}

function makeCopCar(x: number, y: number): Car {
  return {
    id: copId++,
    kind: 'cop',
    x,
    y,
    angle: rand(0, Math.PI * 2),
    vx: 0,
    vy: 0,
    steerVis: 0,
    color: '#E8E8F0',
    health: 100,
    parked: false,
    stolen: false,
    playerDriven: false,
    wrecked: false,
    brakeT: 0,
    honkT: 0,
    hitCd: 0,
    aiAxis: 'v',
    aiDir: 1,
    laneC: 0,
    civCur: 0,
    civTop: 0,
    turnCd: 0,
  };
}

export class PoliceForce {
  readonly cops: CopCar[] = [];
  /** Progresso da detenção (DETIDO quando cruza o limiar). */
  bustedProgress = 0;

  reset(): void {
    this.cops.length = 0;
    this.bustedProgress = 0;
  }

  /** Alguma viatura com visão do jogador (raio simples — usado pela evasão). */
  canSee(px: number, py: number): boolean {
    for (const cop of this.cops) {
      if (dist2(cop.car.x, cop.car.y, px, py) < POLICE_SIGHT * POLICE_SIGHT) return true;
    }
    return false;
  }

  /** Distância da viatura mais próxima (sirene, reflexo na tela). */
  nearestDist(px: number, py: number): number {
    let best = Infinity;
    for (const cop of this.cops) {
      const d = dist2(cop.car.x, cop.car.y, px, py);
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  /** Ajusta o efetivo para o nível de procurado (spawn fora da tela, ~500–760px). */
  private sync(wanted: number, city: City, px: number, py: number): void {
    const target = COPS_BY_LEVEL[clamp(wanted, 0, 5)];
    while (this.cops.length < target) {
      const p = city.randomRoadPoint(480, px, py, 780);
      this.cops.push({
        car: makeCopCar(p.x, p.y),
        shootT: rand(0.8, 1.6),
        stuckT: 0,
        stuckCount: 0,
        reverseT: 0,
        wobble: rand(0, Math.PI * 2),
        lastSeenX: px,
        lastSeenY: py,
      });
    }
    while (this.cops.length > target) {
      // Some com a mais distante primeiro.
      let farIdx = 0;
      let farD = -1;
      this.cops.forEach((cop, i) => {
        const d = dist2(cop.car.x, cop.car.y, px, py);
        if (d > farD) {
          farD = d;
          farIdx = i;
        }
      });
      this.cops.splice(farIdx, 1);
    }
  }

  update(dt: number, ctx: PoliceUpdate): void {
    this.sync(ctx.wanted, ctx.city, ctx.px, ctx.py);

    for (const cop of this.cops) {
      const car = cop.car;
      const dx = ctx.px - car.x;
      const dy = ctx.py - car.y;
      const d = Math.hypot(dx, dy);
      const sees = d < POLICE_SIGHT;
      if (sees) {
        cop.lastSeenX = ctx.px;
        cop.lastSeenY = ctx.py;
      }

      // Pressão constante: viatura perdida há muito tempo reaparece na cola.
      if (d > 1250) {
        const p = ctx.city.randomRoadPoint(500, ctx.px, ctx.py, 800);
        car.x = p.x;
        car.y = p.y;
        car.vx = 0;
        car.vy = 0;
      }

      // Alvo: jogador se visível; senão o último ponto visto (procura).
      let tx = cop.lastSeenX;
      let ty = cop.lastSeenY;
      const distLast = Math.hypot(tx - car.x, ty - car.y);
      const hunting = sees || distLast > 70;

      // Navegação pelas ruas em longa distância/sem visão: as ruas formam uma
      // malha garantidamente livre — rota em "L" sempre sobre o asfalto.
      // Perto do alvo (ou na mesma rua), mira direta para fechar/bater.
      if (hunting && (d > 200 || !sees)) {
        const nv = nearestRoadLine(car.x);
        const nh = nearestRoadLine(car.y);
        const onV = Math.abs(car.x - nv) < 42;
        const onH = Math.abs(car.y - nh) < 42;
        const targetV = nearestRoadLine(tx);
        const targetH = nearestRoadLine(ty);
        const sameCorridor = Math.abs(car.x - tx) < 34 || Math.abs(car.y - ty) < 34;
        if (sameCorridor) {
          // já está na mesma rua do alvo: ataque direto
        } else if (onV) {
          if (Math.abs(car.y - targetH) > 40) {
            tx = car.x; // desce pela vertical atual…
            ty = targetH;
          } else {
            ty = targetH; // …e vira na avenida do alvo, rolando sobre o asfalto
          }
        } else if (onH) {
          if (Math.abs(car.x - targetV) > 40) {
            tx = targetV;
            ty = car.y;
          } else {
            tx = targetV;
          }
        } else {
          // Fora da rua (quicou num quarteirão): volta para a rua mais próxima.
          if (Math.abs(car.x - nv) < Math.abs(car.y - nh)) {
            tx = nv;
            ty = car.y;
          } else {
            tx = car.x;
            ty = nh;
          }
        }
      }

      // Direção desejada com wobble de perseguição (game.md §2.2) + desvio
      // simples de prédios: testa ângulos candidatos e segue o primeiro livre.
      let desired = Math.atan2(ty - car.y, tx - car.x) + Math.sin(ctx.time * 2.7 + cop.wobble) * 0.16;
      desired = clearHeading(car, ctx.city, desired);
      const diff = wrapAngle(desired - car.angle);
      const steer = clamp(diff * 2.4, -1, 1);

      // Manobra de ré quando travado; se insistir em travar, reespawna na cola
      // (pragmático: acontece fora da tela e mantém a pressão da perseguição).
      const spd = carSpeed(car);
      if (spd < 32) cop.stuckT += dt;
      else cop.stuckT = Math.max(0, cop.stuckT - dt * 2);
      if (cop.stuckT > 1.1) {
        cop.reverseT = 0.85;
        cop.stuckT = 0;
        cop.stuckCount++;
        if (cop.stuckCount > 2) {
          const p = ctx.city.randomRoadPoint(480, ctx.px, ctx.py, 760);
          car.x = p.x;
          car.y = p.y;
          car.vx = 0;
          car.vy = 0;
          cop.stuckCount = 0;
        }
      }
      const reversing = cop.reverseT > 0;
      cop.reverseT -= dt;

      // Com o jogador (quase) parado a viatura "encosta" para prender:
      // desacelera cedo e, colada nele, para de vez (não vira demo derby).
      const arresting = d < 50 && ctx.playerSpeed < 60;
      stepCar(car, dt, {
        up: hunting && !reversing && !arresting,
        down: reversing || arresting,
        steer: reversing ? -steer : steer,
        handbrake: false,
      });

      // Rubber-band: alcança de longe, não humilha de perto.
      let maxSp = (d > 520 ? 705 : d < 150 ? 515 : 615) + ctx.wanted * 6;
      if (ctx.playerSpeed < 60) maxSp = Math.min(maxSp, Math.max(55, d * 0.7));
      const s = carSpeed(car);
      if (s > maxSp) {
        car.vx *= maxSp / s;
        car.vy *= maxSp / s;
      }
      moveCar(car, dt, ctx.city);

      // Tiros cartoon a partir de 3★ (curto alcance, chance de acerto).
      if (ctx.wanted >= 3 && sees && d < 255) {
        cop.shootT -= dt;
        if (cop.shootT <= 0) {
          cop.shootT = rand(1.1, 1.8);
          const hitChance = clamp(0.55 - ctx.playerSpeed / 1600, 0.15, 0.55);
          ctx.onShoot(car.x, car.y, chance(hitChance));
        }
      } else {
        cop.shootT = Math.max(cop.shootT, 0.4);
      }
    }
  }

  /**
   * DETIDO: viatura encosta no jogador a pé, ou no carro parado (<10 km/h)
   * com procurado ativo por 1.5s (game.md §3).
   */
  checkBusted(dt: number, px: number, py: number, playerSpeedPx: number, inVehicle: boolean, wanted: number): boolean {
    if (wanted === 0 || this.cops.length === 0) {
      this.bustedProgress = 0;
      return false;
    }
    const radius = inVehicle ? 56 : 36;
    let near = false;
    for (const cop of this.cops) {
      if (dist2(cop.car.x, cop.car.y, px, py) < radius * radius) {
        near = true;
        break;
      }
    }
    // <10 km/h ≈ 33 px/s.
    const qualifies = inVehicle ? near && playerSpeedPx < 33 : near;
    if (qualifies) {
      this.bustedProgress += dt;
    } else {
      this.bustedProgress = Math.max(0, this.bustedProgress - dt * 2.5);
    }
    const needed = inVehicle ? 1.5 : 0.5;
    return this.bustedProgress >= needed;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    // Fase do giroflex a 4 Hz (alterna vermelho/azul).
    const phase = Math.floor(time * 8) % 2; // 0 = vermelho, 1 = azul
    for (const cop of this.cops) {
      const car = cop.car;
      // Glow colorido de raio ~48px no asfalto (a assinatura visual do jogo).
      const glowColor = phase === 0 ? 'rgba(255,59,59,0.30)' : 'rgba(59,130,255,0.30)';
      const g = ctx.createRadialGradient(car.x, car.y, 4, car.x, car.y, 48);
      g.addColorStop(0, glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(car.x - 48, car.y - 48, 96, 96);

      drawCar(ctx, car, false);

      // Barra de luz no teto: metade vermelha, metade azul, lado ativo brilha.
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillStyle = phase === 0 ? '#FF3B3B' : '#7A2A2A';
      ctx.shadowColor = '#FF3B3B';
      ctx.shadowBlur = phase === 0 ? 8 : 0;
      ctx.fillRect(-3, -8, 6, 7);
      ctx.fillStyle = phase === 1 ? '#3B82FF' : '#22386B';
      ctx.shadowColor = '#3B82FF';
      ctx.shadowBlur = phase === 1 ? 8 : 0;
      ctx.fillRect(-3, 1, 6, 7);
      ctx.restore();
    }
  }
}
