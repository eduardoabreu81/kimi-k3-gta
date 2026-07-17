// ============================================================================
// GTA VI Mini — player.ts
// Jogador a pé: cápsula teal com glow (design.md §2.3), WASD/setas, SHIFT corre.
// Movimento com aceleração suave + colisão axis-separated contra a cidade.
// ============================================================================

import { clamp } from './util';
import type { City } from './city';

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

const WALK_SPEED = 128; // px/s
const RUN_SPEED = 200; // px/s (SHIFT)
const ACCEL = 1100; // px/s²
const FRICTION = 9; // /s

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  angle = -Math.PI / 2; // começa olhando para o norte
  private bob = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  update(dt: number, input: MoveInput, city: City): void {
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const moving = dx !== 0 || dy !== 0;
    const target = input.run ? RUN_SPEED : WALK_SPEED;

    if (moving) {
      const inv = 1 / Math.hypot(dx, dy);
      this.vx += dx * inv * ACCEL * dt;
      this.vy += dy * inv * ACCEL * dt;
      const s = this.speed;
      if (s > target) {
        this.vx = (this.vx / s) * target;
        this.vy = (this.vy / s) * target;
      }
      this.angle = Math.atan2(this.vy, this.vx);
      this.bob += dt * (input.run ? 14 : 10);
    } else {
      // Atrito quando solto.
      const f = Math.max(0, 1 - FRICTION * dt);
      this.vx *= f;
      this.vy *= f;
      if (this.speed < 4) {
        this.vx = 0;
        this.vy = 0;
      }
    }

    // Colisão axis-separated (escorrega pelas paredes dos quarteirões).
    const nx = this.x + this.vx * dt;
    if (!this.circleHits(nx, this.y, city)) this.x = nx;
    else this.vx = 0;
    const ny = this.y + this.vy * dt;
    if (!this.circleHits(this.x, ny, city)) this.y = ny;
    else this.vy = 0;
  }

  /** Círculo r=7 do corpo contra prédios/água/bordas. */
  private circleHits(x: number, y: number, city: City): boolean {
    return (
      city.hitSolid(x - 6, y - 6) ||
      city.hitSolid(x + 6, y - 6) ||
      city.hitSolid(x - 6, y + 6) ||
      city.hitSolid(x + 6, y + 6)
    );
  }

  /** Teleporta (usado ao sair do carro e no restart). */
  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const bobY = this.speed > 10 ? Math.sin(this.bob) * 1.6 : 0;
    ctx.save();
    ctx.translate(this.x, this.y + bobY);
    // Sombra suave.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bonequinho top-down teal com glow (assinatura do jogador a pé):
    // perninhas/bracinhos balançando, rosto na frente, cabelo atrás.
    const swing = this.speed > 10 ? Math.sin(this.bob) * 2.2 : 0;
    ctx.rotate(this.angle);
    ctx.shadowColor = '#00E5C7';
    ctx.shadowBlur = 12;
    // Perninhas + tênis (atrás, alternando).
    ctx.fillStyle = '#0B4A41';
    ctx.beginPath();
    ctx.roundRect(-6.5 + swing, -4.6, 4.4, 3.6, 1.6);
    ctx.roundRect(-6.5 - swing, 1.0, 4.4, 3.6, 1.6);
    ctx.fill();
    ctx.fillStyle = '#E8FBF6';
    ctx.beginPath();
    ctx.roundRect(-8.6 + swing, -4.6, 2.4, 3.6, 1.2);
    ctx.roundRect(-8.6 - swing, 1.0, 2.4, 3.6, 1.2);
    ctx.fill();
    // Bracinhos (pele) nos lados.
    ctx.fillStyle = '#F2C094';
    ctx.beginPath();
    ctx.arc(-swing * 0.7 + 0.5, -7.2, 2, 0, Math.PI * 2);
    ctx.arc(swing * 0.7 + 0.5, 7.2, 2, 0, Math.PI * 2);
    ctx.fill();
    // Corpinho teal (ombros largos).
    ctx.fillStyle = '#00E5C7';
    ctx.beginPath();
    ctx.roundRect(-5.5, -6, 10.5, 12, 4.5);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Rosto + cabelo (metade de trás).
    ctx.fillStyle = '#F2C094';
    ctx.beginPath();
    ctx.arc(1.4, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20302C';
    ctx.beginPath();
    ctx.arc(1.4, 0, 3.7, Math.PI * 0.52, Math.PI * 1.48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Anel de glow pulsante bem sutil sob o jogador (legibilidade noturna).
    const pulse = 0.10 + 0.04 * Math.sin(time * 3);
    ctx.fillStyle = `rgba(0,229,199,${clamp(pulse, 0, 1)})`;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
