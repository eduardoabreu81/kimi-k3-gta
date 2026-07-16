// ============================================================================
// GTA VI Mini — vehicles.ts
// Física arcade dos carros (aceleração/freio/ré/esterço proporcional/drift),
// tráfego civil com IA simples seguindo as ruas, marcas de drift com fade ~6s
// e desenho top-down dos carros (faróis em cone, luz de freio, glow do player).
// Visual: design.md §2.3 / game.md §2.2.
// ============================================================================

import { clamp, lerp, lerpAngle, rand, pick, chance } from './util';
import { SIZE, nearestRoadLine } from './city';
import type { City } from './city';

// ── Constantes de física (unidades: px, s) ───────────────────────────────────
export const CAR_LEN = 48;
export const CAR_WID = 26;
const ACCEL = 430;
const BRAKE = 760;
const REV_ACCEL = 330;
export const CAR_MAX_SPEED = 640;
const MAX_REVERSE = 215;
/** Conversão arbitrária px/s → km/h para o velocímetro (sensação arcade). */
export const KMH_FACTOR = 0.3;

export const CIV_COLORS = ['#FF7A29', '#FFD60A', '#7CFF6B', '#8A7BA8', '#FF4757', '#FF6BB0'] as const;

export type CarKind = 'civ' | 'cop';

export interface Car {
  id: number;
  kind: CarKind;
  x: number;
  y: number;
  angle: number; // 0 = leste, sentido horário (tela)
  vx: number;
  vy: number;
  steerVis: number;
  color: string;
  health: number; // 0..100
  parked: boolean;
  stolen: boolean; // já foi roubado antes (crime não repete)
  playerDriven: boolean;
  wrecked: boolean;
  brakeT: number; // timer visual da luz de freio
  honkT: number; // timer do "!" de buzina
  hitCd: number; // cooldown de dano carro×carro (evita moagem por frame)
  // ── IA civil (kinemática, segue faixas) ──
  aiAxis: 'h' | 'v';
  aiDir: 1 | -1;
  laneC: number; // coordenada fixa da faixa (x para 'v', y para 'h')
  civCur: number; // velocidade atual suavizada
  civTop: number; // velocidade de cruzeiro
  turnCd: number;
}

let nextCarId = 1;

export function carSpeed(car: Car): number {
  return Math.hypot(car.vx, car.vy);
}

export function kmhOf(car: Car): number {
  return carSpeed(car) * KMH_FACTOR;
}

/** Cria um carro civil estacionado ou de tráfego. */
export function makeCiv(x: number, y: number, vertical: boolean, parked: boolean): Car {
  const dir: 1 | -1 = chance(0.5) ? 1 : -1;
  const angle = vertical ? (dir === 1 ? Math.PI / 2 : -Math.PI / 2) : dir === 1 ? 0 : Math.PI;
  const roadC = nearestRoadLine(vertical ? x : y);
  // Mão inglesa... não: mão brasileira — anda-se pela direita.
  const laneC = vertical ? roadC + (dir === 1 ? -14 : 14) : roadC + (dir === 1 ? 14 : -14);
  return {
    id: nextCarId++,
    kind: 'civ',
    x: vertical ? laneC : x,
    y: vertical ? y : laneC,
    angle,
    vx: 0,
    vy: 0,
    steerVis: 0,
    color: pick(CIV_COLORS),
    health: 100,
    parked,
    stolen: false,
    playerDriven: false,
    wrecked: false,
    brakeT: 0,
    honkT: 0,
    hitCd: 0,
    aiAxis: vertical ? 'v' : 'h',
    aiDir: dir,
    laneC,
    civCur: 0,
    civTop: rand(135, 185),
    turnCd: rand(0, 1),
  };
}

export interface CarControl {
  up: boolean;
  down: boolean;
  steer: number; // -1..1 (esquerda negativo)
  handbrake: boolean;
}

/**
 * Integra um passo de física arcade do carro (modelo de velocidade decomposta
 * em frente/lateral: o "grip" mata a componente lateral; o freio de mão
 * reduz o grip e permite drift). NÃO move o carro — use moveCar em seguida.
 */
export function stepCar(car: Car, dt: number, ctl: CarControl): void {
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  let fwd = car.vx * cosA + car.vy * sinA;
  let lat = -car.vx * sinA + car.vy * cosA;

  // Acelerador / freio-ré / arrasto.
  if (ctl.up) {
    fwd = Math.min(CAR_MAX_SPEED, fwd + ACCEL * dt);
  } else if (ctl.down) {
    if (fwd > 8) fwd = Math.max(0, fwd - BRAKE * dt);
    else fwd = Math.max(-MAX_REVERSE, fwd - REV_ACCEL * dt);
    car.brakeT = Math.max(car.brakeT, 0.08);
  } else {
    const drag = 120 + Math.abs(fwd) * 0.5;
    fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), drag * dt);
  }
  if (ctl.handbrake) {
    fwd *= Math.max(0, 1 - 2.4 * dt);
    car.brakeT = Math.max(car.brakeT, 0.08);
  }

  // Esterço proporcional à velocidade (nada de girar parado; menos ágil a 190 km/h).
  const range = clamp(Math.abs(fwd) / 120, 0, 1) * (1 - 0.42 * clamp(Math.abs(fwd) / CAR_MAX_SPEED, 0, 1));
  car.angle += ctl.steer * 2.5 * range * (ctl.handbrake ? 1.45 : 1) * dt * (fwd >= 0 ? 1 : -1);
  car.steerVis = lerp(car.steerVis, ctl.steer, Math.min(1, dt * 10));

  // Grip lateral: normal 9.5/s · freio de mão 2.1/s (drift).
  const grip = ctl.handbrake ? 2.1 : 9.5;
  lat *= Math.max(0, 1 - grip * dt);

  const c2 = Math.cos(car.angle);
  const s2 = Math.sin(car.angle);
  car.vx = c2 * fwd - s2 * lat;
  car.vy = s2 * fwd + c2 * lat;
}

/** Componente lateral da velocidade (detecta drift para marcas/fumaça). */
export function lateralSpeed(car: Car): number {
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  return Math.abs(-car.vx * sinA + car.vy * cosA);
}

/** Amostra 6 pontos do corpo do carro contra prédios/água/bordas. */
function bodyHits(car: Car, x: number, y: number, city: City): boolean {
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  const hl = (CAR_LEN / 2) * 0.86;
  const hw = (CAR_WID / 2) * 0.8;
  // 4 cantos + centro da frente/traseira.
  const pts = [
    [hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl * 1.08, 0], [-hl * 1.08, 0],
  ];
  for (const [lx, ly] of pts) {
    if (city.hitSolid(x + lx * c - ly * s, y + lx * s + ly * c)) return true;
  }
  return false;
}

/**
 * Move o carro com colisão axis-separated contra a cidade.
 * Retorna o impacto total absorvido (px/s) — usado p/ dano, shake e som.
 */
export function moveCar(car: Car, dt: number, city: City): number {
  let impact = 0;
  const nx = car.x + car.vx * dt;
  if (!bodyHits(car, nx, car.y, city)) {
    car.x = nx;
  } else {
    impact = Math.max(impact, Math.abs(car.vx));
    car.vx *= -0.32; // ricochete cartoon
  }
  const ny = car.y + car.vy * dt;
  if (!bodyHits(car, car.x, ny, city)) {
    car.y = ny;
  } else {
    impact = Math.max(impact, Math.abs(car.vy));
    car.vy *= -0.32;
  }
  return impact;
}

// ── Tráfego civil (IA simples seguindo as ruas) ─────────────────────────────

export interface Obstacle {
  x: number;
  y: number;
}

/**
 * Atualiza um carro civil: segue a faixa, freia para obstáculos à frente,
 * vira em cruzamentos com 30% de chance e faz conversão suave de ângulo.
 */
export function updateCiv(car: Car, dt: number, obstacles: Obstacle[]): void {
  if (car.parked || car.playerDriven || car.wrecked) return;
  car.turnCd -= dt;
  car.brakeT = Math.max(0, car.brakeT - dt);
  car.honkT = Math.max(0, car.honkT - dt);

  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);

  // Freia se houver obstáculo à frente (jogador, civis, viaturas).
  let want = car.civTop;
  for (const o of obstacles) {
    const rel = (o.x - car.x) * cosA + (o.y - car.y) * sinA;
    const latO = -(o.x - car.x) * sinA + (o.y - car.y) * cosA;
    if (rel > 4 && rel < 88 && Math.abs(latO) < 26) {
      want = rel < 46 ? 0 : car.civTop * 0.3;
      break;
    }
  }
  const prev = car.civCur;
  car.civCur = lerp(car.civCur, want, Math.min(1, dt * (want < prev ? 6 : 2)));
  if (want < prev - 20) car.brakeT = Math.max(car.brakeT, 0.1);

  const oldX = car.x;
  const oldY = car.y;
  let targetAngle = car.angle;

  if (car.aiAxis === 'v') {
    car.x = lerp(car.x, car.laneC, Math.min(1, dt * 5));
    car.y += car.aiDir * car.civCur * dt;
    targetAngle = car.aiDir === 1 ? Math.PI / 2 : -Math.PI / 2;
    // Cruzamento: chance de virar para uma rua horizontal.
    const h = nearestRoadLine(car.y);
    if (Math.abs(car.y - h) < 12 && car.turnCd <= 0 && chance(0.3)) {
      car.aiAxis = 'h';
      car.aiDir = chance(0.5) ? 1 : -1;
      car.laneC = h + (car.aiDir === 1 ? 14 : -14);
      car.turnCd = 1.2;
    }
    // Inverte a marcha nos limites do mundo.
    if (car.y < 60 && car.aiDir === -1) { car.aiDir = 1; car.laneC = nearestRoadLine(car.x) - 14; }
    if (car.y > SIZE - 60 && car.aiDir === 1) { car.aiDir = -1; car.laneC = nearestRoadLine(car.x) + 14; }
  } else {
    car.y = lerp(car.y, car.laneC, Math.min(1, dt * 5));
    car.x += car.aiDir * car.civCur * dt;
    targetAngle = car.aiDir === 1 ? 0 : Math.PI;
    const v = nearestRoadLine(car.x);
    if (Math.abs(car.x - v) < 12 && car.turnCd <= 0 && chance(0.3)) {
      car.aiAxis = 'v';
      car.aiDir = chance(0.5) ? 1 : -1;
      car.laneC = v + (car.aiDir === 1 ? -14 : 14);
      car.turnCd = 1.2;
    }
    if (car.x < 60 && car.aiDir === -1) { car.aiDir = 1; car.laneC = nearestRoadLine(car.y) + 14; }
    // Não entra na água da praia (sólida a partir de 1952).
    if (car.x > 1900 && car.aiDir === 1) { car.aiDir = -1; car.laneC = nearestRoadLine(car.y) - 14; }
  }

  car.angle = lerpAngle(car.angle, targetAngle, Math.min(1, dt * 7));
  if (dt > 0) {
    car.vx = (car.x - oldX) / dt;
    car.vy = (car.y - oldY) / dt;
  }
}

// ── Marcas de drift (fade ~6s) ───────────────────────────────────────────────

interface Mark {
  x: number;
  y: number;
  angle: number;
  age: number;
}

export class DriftMarks {
  private marks: Mark[] = [];
  private accum = 0;

  /** Registra um par de marcas (rodas traseiras) — chamar a cada frame de drift. */
  add(car: Car, dt: number): void {
    this.accum += dt;
    if (this.accum < 0.03) return;
    this.accum = 0;
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    const hl = -CAR_LEN / 2 + 8;
    const hw = CAR_WID / 2 - 3;
    for (const ly of [hw, -hw]) {
      this.marks.push({ x: car.x + hl * c - ly * s, y: car.y + hl * s + ly * c, angle: car.angle, age: 0 });
    }
    if (this.marks.length > 420) this.marks.splice(0, this.marks.length - 420);
  }

  update(dt: number): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      this.marks[i].age += dt;
      if (this.marks[i].age > 6) this.marks.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const m of this.marks) {
      const a = 0.5 * (1 - m.age / 6);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.fillStyle = `rgba(10,10,14,${a.toFixed(3)})`;
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }
  }

  clear(): void {
    this.marks.length = 0;
  }
}

// ── Desenho ──────────────────────────────────────────────────────────────────

/**
 * Desenha um carro top-down (corpo ao longo do eixo X local).
 * isPlayer: faixa branca central + glow teal embaixo (game.md §2.2).
 */
export function drawCar(ctx: CanvasRenderingContext2D, car: Car, isPlayer: boolean): void {
  const L = CAR_LEN;
  const W = CAR_WID;
  ctx.save();
  ctx.translate(car.x, car.y);

  // Glow teal sob o carro do jogador.
  if (isPlayer && !car.wrecked) {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    g.addColorStop(0, 'rgba(0,229,199,0.28)');
    g.addColorStop(1, 'rgba(0,229,199,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-34, -34, 68, 68);
  }

  ctx.rotate(car.angle);

  // Sombra.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(-L / 2 + 3, -W / 2 + 4, L, W, 7);
  ctx.fill();

  // Rodas (escuras, nos cantos).
  ctx.fillStyle = '#0D0D12';
  const wr = 4.5;
  for (const [wx, wy] of [[L * 0.28, W / 2], [L * 0.28, -W / 2], [-L * 0.28, W / 2], [-L * 0.28, -W / 2]] as const) {
    ctx.fillRect(wx - wr, wy - 2.4, wr * 2, 4.8);
  }

  // Corpo.
  const bodyColor = car.wrecked ? '#1A1A20' : car.kind === 'cop' ? '#E8E8F0' : car.color;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 7);
  ctx.fill();

  if (car.kind === 'cop' && !car.wrecked) {
    // Viatura: capô/porta-malas escuros + faixa lateral azul.
    ctx.fillStyle = '#1A1A24';
    ctx.fillRect(L / 2 - 12, -W / 2 + 2, 10, W - 4);
    ctx.fillRect(-L / 2 + 2, -W / 2 + 2, 10, W - 4);
    ctx.fillStyle = '#3B82FF';
    ctx.fillRect(-8, -W / 2 + 1.5, 16, 2.5);
    ctx.fillRect(-8, W / 2 - 4, 16, 2.5);
  } else if (!car.wrecked) {
    // Capô levemente mais escuro nos civis.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(L / 2 - 11, -W / 2 + 3, 8, W - 6);
  }

  // Faixa branca central do carro do jogador.
  if (isPlayer && !car.wrecked) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-L / 2 + 4, -2, L - 8, 4);
  }

  // Para-brisa e vidro traseiro.
  ctx.fillStyle = 'rgba(13,6,24,0.6)';
  ctx.beginPath();
  ctx.roundRect(L * 0.08, -W / 2 + 4, 9, W - 8, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-L * 0.32, -W / 2 + 5, 7, W - 10, 3);
  ctx.fill();

  // Luz de freio: glow vermelho na traseira.
  if (car.brakeT > 0 && !car.wrecked) {
    ctx.save();
    ctx.shadowColor = '#FF3B3B';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF3B3B';
    ctx.fillRect(-L / 2 + 1, -W / 2 + 3, 3, 5);
    ctx.fillRect(-L / 2 + 1, W / 2 - 8, 3, 5);
    ctx.restore();
  }

  ctx.restore();

  // Faróis: 2 cones aditivos à frente (somente se ligado/à noite — sempre).
  if (!car.wrecked && (isPlayer || !car.parked)) {
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,247,224,0.16)';
    for (const side of [1, -1]) {
      // Farol no canto dianteiro; cone de 96px espalhando ~26px para fora.
      const bx = car.x + (L / 2) * c - side * (W / 2 - 4) * s;
      const by = car.y + (L / 2) * s + side * (W / 2 - 4) * c;
      const p1x = bx + 96 * c - side * 26 * s;
      const p1y = by + 96 * s + side * 26 * c;
      const p2x = bx + 96 * c + side * 8 * s;
      const p2y = by + 96 * s - side * 8 * c;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Buzina: "!" amarelo sobre o teto (civil assustado com quase-colisão).
  if (car.honkT > 0) {
    const bounce = Math.sin(car.honkT * 18) * 2;
    ctx.save();
    ctx.translate(car.x, car.y - 24 + bounce);
    ctx.fillStyle = '#FFD60A';
    ctx.beginPath();
    ctx.roundRect(-7, -7, 14, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#1A1A24';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 0.5);
    ctx.restore();
  }
}
