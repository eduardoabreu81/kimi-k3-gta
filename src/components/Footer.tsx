import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useLang } from '@/i18n'
import { scrollToTop } from '@/lib/scroll'

/**
 * Footer — design.md §8.2
 * Fundo night-900, borda superior grad-teal-line, disclaimer legal exato
 * (versões PT e EN fiéis no dict i18n), links, linha final pixel.
 * Fade-in em bloco ao entrar na viewport.
 */
export default function Footer() {
  const { t } = useLang()
  const rootRef = useRef<HTMLElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          root.querySelector('.reveal-block')?.classList.add('is-visible')
          lineRef.current?.classList.remove('scale-x-0')
          io.disconnect()
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -5% 0px' },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  const year = new Date().getFullYear()

  return (
    <footer ref={rootRef} className="relative bg-night-900">
      {/* borda superior grad-teal-line com scaleX 0→1 */}
      <div
        ref={lineRef}
        className="grad-teal-line h-px w-full origin-center scale-x-0 transition-transform duration-700 ease-out"
        aria-hidden="true"
      />
      <div className="reveal-block container-site grid gap-12 py-16 md:grid-cols-3">
        {/* col 1: logo + disclaimer legal (texto exato — design.md §8.2) */}
        <div>
          <p className="font-display text-2xl uppercase leading-none">
            <span className="text-text-hi">GTA VI </span>
            <span className="grad-text-vice">MINI</span>
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-text-dim">{t.footer.disclaimer}</p>
        </div>

        {/* col 2: links */}
        <nav aria-label={t.footer.navigation} className="flex flex-col items-start gap-4">
          <span className="font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon">
            {t.footer.navigation}
          </span>
          <Link to="/jogar" className="btn-ghost">
            {t.footer.play}
          </Link>
          <Link to="/como-jogar" className="btn-ghost">
            {t.footer.howTo}
          </Link>
          <button type="button" onClick={scrollToTop} className="btn-ghost">
            {t.footer.backToTop}
          </button>
        </nav>

        {/* col 3: assinatura */}
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon">
            {t.footer.credits}
          </span>
          <p className="text-base text-text-mid">{t.footer.madeBy}</p>
          <p className="text-sm text-text-dim">
            {year} · {t.footer.community}
          </p>
        </div>
      </div>

      {/* linha final pixel */}
      <div className="border-t border-[rgba(201,184,232,0.1)]">
        <p className="container-site py-6 text-center font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim">
          {t.footer.bottomLine}
        </p>
      </div>
    </footer>
  )
}
