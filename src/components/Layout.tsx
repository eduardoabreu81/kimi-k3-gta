import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import KimiBadge from '@/components/KimiBadge'
import { setLenis, getLenis } from '@/lib/scroll'

gsap.registerPlugin(ScrollTrigger)

/**
 * Layout do site (home, como-jogar) — padrão nested-route: renderiza <Outlet/>.
 * A tela do jogo (/jogar) fica FORA deste Layout (fullscreen, sem Lenis).
 * Navbar sticky: o conteúdo flui normalmente abaixo dela, sem offsets.
 */
export default function Layout() {
  const { pathname } = useLocation()

  // Lenis smooth scroll (design.md §5.1) — apenas nas páginas do site
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const lenis = new Lenis({ lerp: 0.1 })
    setLenis(lenis)
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  // volta ao topo ao trocar de rota — Lenis-aware: window.scrollTo sozinho é
  // sobrescrito pelo Lenis no frame seguinte (bug do "voltar ao início")
  useEffect(() => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-night-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* crédito sempre visível (ícone na janela principal) */}
      <KimiBadge />
    </div>
  )
}
