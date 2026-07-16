import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import LangToggle from '@/components/LangToggle'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Navbar — design.md §8.1
 * sticky top-0 z-50, backdrop-blur 12px, fundo rgba(7,3,15,.6), borda
 * inferior 1px rgba(201,184,232,.1). Sombra ao rolar >40px.
 * Mobile: hambúrguer → drawer fullscreen night-950 (links Anton 40px,
 * stagger 0.07s — Framer Motion, isolado neste componente).
 */
export default function Navbar() {
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  const LINKS = [
    { to: '/', label: t.nav.home, end: true },
    { to: '/como-jogar', label: t.nav.howTo, end: false },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header
        className={cn(
          'nav-enter sticky top-0 z-50 border-b border-[rgba(201,184,232,0.1)] bg-[rgba(7,3,15,0.6)] backdrop-blur-md transition-shadow duration-300',
          scrolled && 'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        )}
      >
        <nav className="container-site flex h-16 items-center justify-between gap-4">
          {/* logo */}
          <Link to="/" className="flex items-center gap-3" aria-label={t.nav.logoAria}>
            <span className="font-display text-2xl uppercase leading-none tracking-[0.01em]">
              <span className="text-text-hi">GTA VI </span>
              <span className="grad-text-vice">MINI</span>
            </span>
            <span className="chip-pixel hidden lg:inline-flex">{t.nav.fanEdition}</span>
          </Link>

          {/* links desktop */}
          <div className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn('btn-ghost text-[15px]', isActive && 'text-text-hi')
                }
              >
                {l.label}
              </NavLink>
            ))}
            <LangToggle />
            <Link to="/jogar" className="btn-primary btn-cta px-6 py-2.5 text-sm">
              {t.nav.playNow}
            </Link>
          </div>

          {/* hambúrguer mobile */}
          <button
            type="button"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-lg border border-[rgba(201,184,232,0.25)] bg-night-800 md:hidden"
          >
            <span
              className={cn(
                'h-0.5 w-5 bg-text-hi transition-transform duration-200',
                open && 'translate-y-2 rotate-45',
              )}
            />
            <span className={cn('h-0.5 w-5 bg-text-hi transition-opacity duration-200', open && 'opacity-0')} />
            <span
              className={cn(
                'h-0.5 w-5 bg-text-hi transition-transform duration-200',
                open && '-translate-y-2 -rotate-45',
              )}
            />
          </button>
        </nav>
      </header>

      {/* drawer mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex flex-col bg-night-950 md:hidden"
          >
            <div className="container-site flex h-16 items-center justify-between">
              <span className="font-display text-2xl uppercase leading-none">
                <span className="text-text-hi">GTA VI </span>
                <span className="grad-text-vice">MINI</span>
              </span>
              <button
                type="button"
                aria-label={t.nav.closeMenu}
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(201,184,232,0.25)] bg-night-800 text-2xl text-text-hi"
              >
                ×
              </button>
            </div>
            <motion.nav
              className="flex flex-1 flex-col items-start justify-center gap-8 px-8"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.07 } } }}
            >
              {[...LINKS, { to: '/jogar', label: t.nav.playNow, end: false }].map((l) => (
                <motion.div
                  key={l.to}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'font-display text-[40px] uppercase leading-tight tracking-[0.02em]',
                      l.to === '/jogar' ? 'grad-text-vice' : 'text-text-hi',
                    )}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { duration: 0.4 } },
                }}
                className="mt-2"
              >
                <LangToggle />
              </motion.div>
              <motion.p
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { duration: 0.4 } },
                }}
                className="mt-6 font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim"
              >
                {t.nav.drawerNote}
              </motion.p>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
