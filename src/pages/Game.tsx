import { Link } from 'react-router'

/**
 * /jogar — STUB (será substituído pela tela do jogo, fora do Layout: fullscreen).
 */
export default function Game() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-night-950 px-6 text-center">
      <h1 className="grad-text-vice font-display text-[clamp(56px,9vw,120px)] uppercase leading-none tracking-[0.01em]">
        Em Obras
      </h1>
      <p className="max-w-md text-lg text-text-mid">
        A cidade está sendo asfaltada. Volte em instantes para acelerar.
      </p>
      <Link to="/" className="btn-secondary">
        Voltar para o início
      </Link>
    </div>
  )
}
