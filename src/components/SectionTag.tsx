import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * SectionTag — design.md §8.6
 * Label pixel (Press Start 2P 10px) em teal-neon, prefixada por traço 24px grad-teal-line.
 * Uso: <SectionTag>O JOGO</SectionTag>  →  "— O JOGO"
 */
export default function SectionTag({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span aria-hidden="true" className="grad-teal-line h-px w-6 shrink-0" />
      <span className="font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon">
        {children}
      </span>
    </div>
  )
}
