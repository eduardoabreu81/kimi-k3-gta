import { useLang } from '@/i18n'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/utils'

/* ============================================================================
   LangToggle — seletor segmentado PT | EN (pixel labels, borda teal, ativo
   com grad-vice, focus ring teal, aria-pressed). Usado na Navbar (desktop +
   drawer mobile), no PauseMenu e no GameOverOverlay.
   ========================================================================== */

const OPTIONS: Array<{ id: Lang; label: string }> = [
  { id: 'pt', label: 'PT' },
  { id: 'en', label: 'EN' },
]

export default function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang()
  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={cn(
        'inline-flex overflow-hidden rounded-lg border border-teal-neon/70 bg-night-800',
        className,
      )}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={lang === o.id}
          onClick={() => setLang(o.id)}
          className={cn(
            'px-3 py-1.5 font-pixel text-[9px] uppercase tracking-[0.08em] transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-neon focus-visible:ring-offset-1 focus-visible:ring-offset-night-950',
            lang === o.id
              ? 'grad-vice text-night-950'
              : 'text-text-dim hover:text-teal-neon',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
