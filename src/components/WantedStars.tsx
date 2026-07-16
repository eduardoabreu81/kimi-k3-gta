import { useEffect, useState } from 'react'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

export const STAR_PATH =
  'M12 2.2 L14.9 8.4 L21.7 9.2 L16.6 13.9 L18 20.6 L12 17.2 L6 20.6 L7.4 13.9 L2.3 9.2 L9.1 8.4 Z'

const GOLD_GLOW =
  'drop-shadow(0 0 6px rgba(255,214,10,.6)) drop-shadow(0 0 14px rgba(255,214,10,.25))'

export interface WantedStarsProps {
  /** nível de procurado atual, 0..5 */
  level?: number
  /** tamanho de cada estrela em px — 28 no HUD, 40 no site (design.md §8.4) */
  size?: number
  /** modo site: hover/click define o nível e dispara a descrição */
  interactive?: boolean
  /** modo evasão (no jogo): estrelas cheias piscam gold↔branco a 2 Hz */
  evading?: boolean
  onLevelChange?: (level: number) => void
  className?: string
}

/**
 * WantedStars — design.md §8.4
 * 5 slots de estrela SVG. Cheia: fill star-gold + glow ouro; vazia: stroke
 * rgba(255,247,240,.25). Pop de entrada scale 1.6→1 (200ms, back.out(2),
 * stagger 90ms). Modo interativo para o site, modo evasão para o HUD.
 */
export default function WantedStars({
  level = 0,
  size = 40,
  interactive = false,
  evading = false,
  onLevelChange,
  className,
}: WantedStarsProps) {
  const { t } = useLang()
  const clamped = Math.max(0, Math.min(5, Math.round(level)))
  // estrelas que devem rodar o "pop" (entrada inicial + estrelas recém-ganhas)
  const [pops, setPops] = useState<number[]>(() =>
    Array.from({ length: clamped }, (_, i) => i),
  )
  const [prevLevel, setPrevLevel] = useState(clamped)

  // estado derivado da prop level (padrão oficial: ajustar estado no render)
  if (clamped !== prevLevel) {
    setPrevLevel(clamped)
    if (clamped > prevLevel) {
      const newly: number[] = []
      for (let i = prevLevel; i < clamped; i++) newly.push(i)
      setPops(newly)
    }
  }

  // limpa os pops depois que a animação termina
  useEffect(() => {
    if (pops.length === 0) return
    const t = window.setTimeout(() => setPops([]), 500 + pops.length * 90)
    return () => window.clearTimeout(t)
  }, [pops])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || !onLevelChange) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onLevelChange(Math.min(5, clamped + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onLevelChange(Math.max(1, clamped - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      onLevelChange(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      onLevelChange(5)
    }
  }

  const renderStar = (i: number) => {
    const filled = i < clamped
    const popping = pops.includes(i)
    const svg = (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn(popping && 'animate-star-pop')}
        style={{
          animationDelay: popping ? `${i * 90}ms` : undefined,
          filter: filled ? GOLD_GLOW : undefined,
        }}
      >
        <path
          d={STAR_PATH}
          className={cn(filled && evading && 'animate-wanted-blink')}
          fill={filled ? '#FFD60A' : 'transparent'}
          stroke={filled ? '#FFD60A' : 'rgba(255,247,240,.25)'}
          strokeWidth={filled ? 0.8 : 1.5}
          strokeLinejoin="round"
        />
      </svg>
    )

    if (!interactive) {
      return (
        <span key={i} className="inline-flex shrink-0">
          {svg}
        </span>
      )
    }

    return (
      <button
        key={i}
        type="button"
        aria-label={t.game.stars.level(i + 1)}
        aria-pressed={filled}
        className="inline-flex shrink-0 cursor-pointer rounded-sm transition-transform duration-150 hover:scale-110"
        onMouseEnter={() => onLevelChange?.(i + 1)}
        onFocus={() => onLevelChange?.(i + 1)}
        onClick={() => onLevelChange?.(i + 1)}
      >
        {svg}
      </button>
    )
  }

  return (
    <div
      role={interactive ? 'group' : 'img'}
      aria-label={t.game.stars.group(clamped)}
      className={cn('inline-flex items-center gap-1.5', className)}
      onKeyDown={handleKeyDown}
    >
      {[0, 1, 2, 3, 4].map(renderStar)}
    </div>
  )
}
