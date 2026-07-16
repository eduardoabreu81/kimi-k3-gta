import { useEffect, useRef, useState } from 'react'

/* ============================================================================
   Hooks e helpers compartilhados da UI do jogo
   ========================================================================== */

/** true quando o ponteiro principal é touch (game.md §8 — mobile/coarse) */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return coarse
}

/** true quando o usuário pediu redução de movimento */
export function useReducedMotionPref(): boolean {
  const [reduce, setReduce] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduce
}

/**
 * Count-up eased (power2.out) de 0 → target (game-over.md §4: 600ms).
 * Com prefers-reduced-motion, pula direto para o valor final.
 */
export function useCountUp(target: number, duration = 600, delay = 0, enabled = true): number {
  const reduce = useReducedMotionPref()
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!enabled || reduce) return
    let raf = 0
    const t0 = performance.now() + delay
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / duration))
      const eased = 1 - (1 - p) * (1 - p)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay, enabled, reduce])
  /* reduced motion: valor final imediato, sem animar */
  if (reduce) return target
  return value
}

/**
 * Número "odômetro": interpola suavemente até o valor atual (game.md §4.1,
 * dinheiro rola em ~300ms ao ganhar).
 */
export function useRolledNumber(target: number, duration = 300): number {
  const reduce = useReducedMotionPref()
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)
  useEffect(() => {
    if (reduce) return
    const from = fromRef.current
    if (from === target) return
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - (1 - p) * (1 - p)
      const v = from + (target - from) * eased
      setValue(v)
      fromRef.current = v
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, reduce])
  /* reduced motion: acompanha o alvo sem rolagem */
  if (reduce) return target
  return value
}

/** `mm:ss` (game.md §4.1 TEMPO / game-over.md §4 TEMPO DE FUGA) */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const brl = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** `R$ 1.250` (game.md §4.1) — locale vem do idioma ativo */
export function formatMoney(v: number, locale = 'pt-BR'): string {
  return `R$ ${(locale === 'en-US' ? usd : brl).format(Math.round(v))}`
}

/** `8,2 km` / `8.2 km` (game-over.md §4) */
export function formatKm(v: number, locale = 'pt-BR'): string {
  return `${v.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`
}
