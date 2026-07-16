import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import LangToggle from '@/components/LangToggle'
import SectionTag from '@/components/SectionTag'
import WantedStars, { STAR_PATH } from '@/components/WantedStars'
import type { GameOverPayload } from '@/game/types'
import { useLang } from '@/i18n'
import type { Dict } from '@/i18n'
import { formatClock, formatKm, formatMoney, useCoarsePointer, useCountUp } from './hooks'

/* ============================================================================
   GameOverOverlay — game-over.md. Dois estados-overlay sobre o canvas
   congelado de /jogar (sem mudança de rota):
     DETIDO     (kind 'busted') — sirene red/blue alternando a 2 Hz + slam
     SE DEU MAL (kind 'wasted') — vignette vermelha contraindo + pulso
   Painel "RELATÓRIO DA FUGA" com 6 estatísticas (count-up 600ms), badge
   NOVO RECORDE! com confete de estrelas, botões Jogar Novamente (R) /
   Voltar ao Início / Ver Como Jogar. ESC não fecha (tratado em Game.tsx).
   ========================================================================== */

const EASE_SLAM = [0.895, 0.03, 0.685, 0.22] as [number, number, number, number] // power4.in

export interface GameOverOverlayProps {
  payload: GameOverPayload | null
  /** "Jogar Novamente" → Game chama handle.restart() e reseta o estado local */
  onRestart: () => void
}

const buzz = (ms: number) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* sem suporte a vibração — ignora */
  }
}

/** variante de subtítulo por causa da morte (game-over.md §3) — casa PT e EN */
function causeVariant(cause: string, d: Dict['game']['over']): string | null {
  const c = cause.toLowerCase()
  if (c.includes('explos')) return d.causeExplosion
  if (c.includes('capot') || c.includes('rolled') || c.includes('rollover')) return d.causeRollover
  return null
}

/* ---------- confete de 24 estrelas gold (16 no mobile) — §4 ---------------- */
function StarConfetti({ count }: { count: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4
        const dist = 72 + ((i * 37) % 64)
        const dx = Math.cos(angle) * dist
        const dy = Math.sin(angle) * dist * 0.55 - 30 + ((i * 53) % 70) // sobe e cai (gravidade)
        const rot = ((i * 97) % 360) - 180
        const delay = (i % 6) * 45
        return {
          '--dx': `${dx.toFixed(0)}px`,
          '--dy': `${dy.toFixed(0)}px`,
          '--rot': `${rot}deg`,
          '--delay': `${delay}ms`,
        } as CSSProperties
      }),
    [count],
  )
  return (
    <>
      {stars.map((style, i) => (
        <svg
          key={i}
          aria-hidden="true"
          className="gm-confetti-star"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          style={style}
        >
          <path d={STAR_PATH} fill="#FFD60A" />
        </svg>
      ))}
    </>
  )
}

/* ---------- painel de estatísticas (§4) ------------------------------------ */
function StatsPanel({ payload, coarse }: { payload: GameOverPayload; coarse: boolean }) {
  const { t } = useLang()
  const { stats, isRecord } = payload
  /* count-up 600ms power2.out, após a entrada do painel (§4) */
  const time = useCountUp(stats.timeSec, 600, 750)
  const dist = useCountUp(stats.distanceKm, 600, 800)
  const money = useCountUp(stats.moneyEarned, 600, 850)
  const cars = useCountUp(stats.carsStolen, 600, 900)
  const score = useCountUp(stats.score, 600, 950)

  const rows: Array<{ label: string; value: React.ReactNode; cash?: boolean }> = [
    { label: t.game.over.rows[0], value: formatClock(time) },
    { label: t.game.over.rows[1], value: formatKm(dist, t.locale) },
    { label: t.game.over.rows[2], value: formatMoney(money, t.locale), cash: true },
    {
      label: t.game.over.rows[3],
      value: <WantedStars level={stats.maxWanted} size={20} />,
    },
    { label: t.game.over.rows[4], value: String(Math.round(cars)) },
    /* O contrato RunStats não traz "pedestres assustados" (game-over.md §4);
       a 6ª estatística usa a pontuação final calculada pela engine. */
    { label: t.game.over.rows[5], value: Math.round(score).toLocaleString(t.locale) },
  ]

  return (
    <div className="relative mt-7 w-full max-w-[560px]">
      {isRecord && (
        <div className="absolute -top-5 left-1/2 z-10 -translate-x-1/2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.85 }}
            className="relative"
          >
            <span className="grad-vice inline-block rounded-full px-4 py-2 font-pixel text-[10px] uppercase tracking-[0.08em] text-night-950">
              {t.game.over.newRecord}
            </span>
            <StarConfetti count={coarse ? 16 : 24} />
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 0.55 }}
        className="w-full rounded-[20px] border border-violet-haze p-6 backdrop-blur-[8px] sm:p-10"
        style={{ background: 'rgba(21,10,38,.9)' }}
      >
        <SectionTag className="justify-center">{t.game.over.report}</SectionTag>

        {/* stats zerados (morte em <10s) — chip de humor (§7) */}
        {stats.timeSec < 10 && (
          <p className="mt-3 text-center text-sm text-text-dim">{t.game.over.speedRecord}</p>
        )}

        <motion.div
          className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.7 } },
          }}
        >
          {rows.map((row) => (
            <motion.div
              key={row.label}
              variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-1.5 sm:items-start"
            >
              <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                {row.label}
              </span>
              <span
                className={
                  row.cash
                    ? 'font-sans text-[28px] font-bold leading-none tabular-nums text-cash-green'
                    : 'font-sans text-[28px] font-bold leading-none tabular-nums text-text-hi'
                }
              >
                {row.value}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ---------- overlay principal ---------------------------------------------- */
export default function GameOverOverlay({ payload, onRestart }: GameOverOverlayProps) {
  const { t } = useLang()
  const navigate = useNavigate()
  const coarse = useCoarsePointer()
  const primaryRef = useRef<HTMLButtonElement>(null)

  const kind = payload?.kind ?? null
  const busted = kind === 'busted'

  /* foco inicial no botão primário (§1); ESC não fecha (regra de Game.tsx) */
  useEffect(() => {
    if (!payload) return
    const t = window.setTimeout(() => primaryRef.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [payload])

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          key={payload.kind}
          role="dialog"
          aria-modal="true"
          aria-label={busted ? t.game.over.bustedAria : t.game.over.wastedAria}
          data-allow-scroll
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] overflow-y-auto"
        >
          {/* ------- camada de identidade do estado ------- */}
          {busted ? (
            <>
              {/* duas metades red/blue alternando a 2 Hz (§2) */}
              <div
                aria-hidden="true"
                className="gm-busted-layer fixed inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255,59,59,.18) 0% 50%, rgba(59,130,255,.18) 50% 100%)',
                }}
              />
              <div
                aria-hidden="true"
                className="gm-busted-layer-inv fixed inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(59,130,255,.18) 0% 50%, rgba(255,59,59,.18) 50% 100%)',
                }}
              />
              {/* radial glows nos cantos superiores, mesmo ritmo */}
              <div
                aria-hidden="true"
                className="gm-busted-layer grad-police-red fixed -left-32 -top-32 h-[28rem] w-[28rem] rounded-full"
              />
              <div
                aria-hidden="true"
                className="gm-busted-layer grad-police-blue fixed -right-32 -top-32 h-[28rem] w-[28rem] rounded-full"
              />
              <div
                aria-hidden="true"
                className="gm-busted-layer-inv grad-police-blue fixed -left-32 -top-32 h-[28rem] w-[28rem] rounded-full"
              />
              <div
                aria-hidden="true"
                className="gm-busted-layer-inv grad-police-red fixed -right-32 -top-32 h-[28rem] w-[28rem] rounded-full"
              />
              {/* bordas com box-shadow inset alternando red/blue */}
              <div aria-hidden="true" className="gm-busted-border fixed inset-0" />
              {/* variante estática p/ prefers-reduced-motion (§6) */}
              <div aria-hidden="true" className="gm-busted-static fixed inset-0" />
              <div
                aria-hidden="true"
                className="fixed inset-0"
                style={{ background: 'rgba(7,3,15,.35)' }}
              />
            </>
          ) : (
            <>
              {/* tint vermelho + vignette contraindo das bordas ao centro (§3) */}
              <div
                aria-hidden="true"
                className="fixed inset-0"
                style={{ background: 'rgba(255,71,87,.15)' }}
              />
              <div aria-hidden="true" className="gm-wasted-vignette fixed inset-0" />
              <div
                aria-hidden="true"
                className="fixed inset-0"
                style={{ background: 'rgba(7,3,15,.45)' }}
              />
            </>
          )}

          {/* ------- conteúdo (com shake no impacto do slam) ------- */}
          <motion.div
            className="relative flex min-h-full flex-col items-center justify-center px-4 py-12"
            initial={{ x: 0, y: 0 }}
            animate={
              busted
                ? { x: [0, -8, 6, -4, 0], y: [0, 4, -3, 2, 0] }
                : { x: [0, -6, 5, -3, 0], y: [0, 3, -2, 1, 0] }
            }
            transition={{ delay: busted ? 0.4 : 0.45, duration: 0.3, ease: 'easeOut' }}
          >
            {/* flash do momento da prisão (80ms) / da morte (120ms vermelho) */}
            <motion.div
              aria-hidden="true"
              className={busted ? 'fixed inset-0 bg-white' : 'fixed inset-0 bg-police-red'}
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: busted ? 0.08 : 0.12, ease: 'easeOut' }}
            />

            {/* título gigante com slam */}
            <motion.div
              initial={{ scale: busted ? 3 : 2.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: busted ? 0.4 : 0.45, ease: EASE_SLAM }}
            >
              {busted ? (
                <h1
                  data-text={t.game.over.busted}
                  className="gm-glitch gm-glitch-impact gm-glitch-police text-center font-display text-[clamp(72px,14vw,140px)] uppercase leading-none tracking-[0.01em]"
                  style={{
                    backgroundImage: 'linear-gradient(90deg,#FF3B3B,#3B82FF)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextStroke: '2px rgba(255,247,240,.85)',
                    filter:
                      'drop-shadow(0 0 28px rgba(255,59,59,.5)) drop-shadow(0 0 28px rgba(59,130,255,.5))',
                  }}
                >
                  {t.game.over.busted}
                </h1>
              ) : (
                <h1
                  className="gm-wasted-pulse text-center font-display text-[clamp(56px,11vw,120px)] uppercase leading-none tracking-[0.01em]"
                  style={{
                    backgroundImage: 'linear-gradient(180deg,#FF4757,#C81E3A)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 0 32px rgba(255,71,87,.55))',
                  }}
                >
                  {t.game.over.wasted}
                </h1>
              )}
            </motion.div>

            {/* subtítulo (H3, text-hi) */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: busted ? 0.55 : 0.6 }}
              className="mt-4 text-center font-sans text-2xl font-bold text-text-hi"
            >
              {busted ? t.game.over.bustedSub : t.game.over.wastedSub}
            </motion.p>

            {/* variante por causa da morte (§3) */}
            {!busted && causeVariant(payload.cause, t.game.over) && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="mt-2 text-center text-sm text-text-dim"
              >
                {causeVariant(payload.cause, t.game.over)}
              </motion.p>
            )}

            <StatsPanel payload={payload} coarse={coarse} />

            {/* ------- botões (§5) ------- */}
            <motion.div
              className="mt-7 flex w-full max-w-[560px] flex-col gap-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.07, delayChildren: 0.95 } },
              }}
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
              >
                <button
                  ref={primaryRef}
                  type="button"
                  className="btn-primary min-h-14 w-full"
                  onClick={() => {
                    buzz(15)
                    onRestart()
                  }}
                >
                  {t.game.over.playAgain}
                </button>
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  className="btn-secondary min-h-14 w-full"
                  onClick={() => navigate('/')}
                >
                  {t.game.over.backHome}
                </button>
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
                className="flex justify-center"
              >
                <button type="button" className="btn-ghost" onClick={() => navigate('/como-jogar')}>
                  {t.game.over.seeHowTo}
                </button>
              </motion.div>
              {/* idioma — perto dos botões */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
                className="flex justify-center pt-1"
              >
                <LangToggle />
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="mt-4 text-center font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim"
            >
              {t.game.over.rPlayAgain}
            </motion.p>

            {/* descrição para leitores de tela */}
            <span className="sr-only">
              {t.game.over.srStats(
                formatClock(payload.stats.timeSec),
                formatKm(payload.stats.distanceKm, t.locale),
                formatMoney(payload.stats.moneyEarned, t.locale),
                payload.stats.maxWanted,
                payload.stats.carsStolen,
                payload.stats.score.toLocaleString(t.locale),
              )}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
