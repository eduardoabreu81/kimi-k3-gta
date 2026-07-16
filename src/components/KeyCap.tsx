import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * KeyCap — design.md §8.5
 * Tecla de teclado: caixa 44x44 (ou auto x 44), night-700, borda 1px,
 * borda inferior 3px (efeito tecla física), Space Grotesk 700 14px.
 * Hover: a tecla "afunda" (translateY 2px).
 */
export default function KeyCap({
  children,
  className,
  wide = false,
}: {
  children: ReactNode
  className?: string
  /** wide: largura automática (para teclas como ESPAÇO, SHIFT) */
  wide?: boolean
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-lg border border-[rgba(201,184,232,0.25)] border-b-[3px] bg-night-700 px-2 font-sans text-sm font-bold text-text-hi transition-transform duration-150 hover:translate-y-0.5',
        wide ? 'min-w-11 px-3' : 'w-11',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
