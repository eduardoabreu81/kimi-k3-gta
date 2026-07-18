// ============================================================================
// GTA VI Mini — utilitários internos da engine (matemática, RNG, storage)
// Somente código da engine — sem dependência de React/DOM de UI.
// ============================================================================

/** Limita um valor entre min e max. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Interpolação linear. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fator de lerp independente de framerate (equivalente a `rate` por frame a 60fps). */
export function damp(rate: number, dt: number): number {
  return 1 - Math.pow(1 - rate, dt * 60);
}

/** Distância euclidiana. */
export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Distância ao quadrado (evita sqrt em loops quentes). */
export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Normaliza ângulo para o intervalo (-PI, PI]. */
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/** Interpola ângulos pelo caminho mais curto. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

/** Aleatório uniforme em [min, max). */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Inteiro aleatório em [min, max] (inclusivo). */
export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

/** Sorteia um elemento do array. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Chance booleana (0..1). */
export function chance(p: number): boolean {
  return Math.random() < p;
}

// ── localStorage seguro (modo privado pode lançar exceção) ──────────────────

export function storageGet(key: string, fallback: string): string {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sem storage disponível — segue o jogo */
  }
}

export function storageGetInt(key: string, fallback: number): number {
  const v = Number.parseInt(storageGet(key, ''), 10);
  return Number.isFinite(v) ? v : fallback;
}

// ── Acessibilidade: "reduzir movimento" ──────────────────────────────────────
// Override manual (switch do menu de pausa) tem prioridade sobre o matchMedia.

export const REDUCE_MOTION_KEY = 'gtamini.cfg.reduzir-movimento'; // '1' | '0'
/** Evento disparado na window quando o override muda — engine e hooks reagem. */
export const REDUCE_MOTION_EVENT = 'gtamini:reduzir-movimento';

/** Override salvo: true/false explícito, ou null (nunca tocado → vale o SO). */
export function readReducedMotionOverride(): boolean | null {
  const v = storageGet(REDUCE_MOTION_KEY, '');
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
}

/** Preferência efetiva de redução de movimento (override ?? media query). */
export function prefersReducedMotion(): boolean {
  return (
    readReducedMotionOverride() ??
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Formata segundos como mm:ss (usado em toasts). */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
