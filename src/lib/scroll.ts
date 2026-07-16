import type Lenis from 'lenis'

/**
 * Singleton do Lenis (smooth scroll do site — design.md §5.1).
 * O Layout registra a instância; qualquer componente do site pode rolar
 * suavemente via scrollToTop(). Nunca usar na tela do jogo.
 */
let lenis: Lenis | null = null

export function setLenis(instance: Lenis | null) {
  lenis = instance
}

export function getLenis() {
  return lenis
}

export function scrollToTop() {
  if (lenis) {
    lenis.scrollTo(0, { duration: 1.2 })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
