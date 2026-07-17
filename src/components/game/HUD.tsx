import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Volume2, VolumeX } from 'lucide-react'
import WantedStars from '@/components/WantedStars'
import type { HudState } from '@/game/types'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'
import { formatClock, useRolledNumber } from './hooks'

/* ============================================================================
   HUD — game.md §4. DOM sobre o canvas, pointer-events: none (exceto botões).
   Barra superior (dinheiro, estrelas, tempo, ações), minimapa (bottom-left,
   top-right no mobile §8), velocímetro + vida (bottom-right), dica contextual,
   toasts (§8.8 design.md), splash central (§4.5) e overlays de feedback
   (reflexo policial §2.3, vignette de dano §4.3).
   ========================================================================== */

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]
const EASE_SLAM = [0.895, 0.03, 0.685, 0.22] as [number, number, number, number] // power4.in

export interface HUDProps {
  hud: HudState
  /** relógio da corrida mantido pela UI (o contrato HudState não traz tempo) */
  elapsedSec: number
  /** true quando a tela terminou de carregar → HUD entra com stagger 100ms (§4.1) */
  entered: boolean
  /** canvas do minimapa — a engine desenha nele */
  minimapRef: Ref<HTMLCanvasElement>
  onPauseClick: () => void
  onMuteClick: () => void
}

/** entrada escalonada do HUD (§4.1: stagger 100ms, power3.out) */
function enter(entered: boolean, delay: number, from: { x?: number; y?: number; scale?: number }) {
  const hidden = { opacity: 0, x: from.x ?? 0, y: from.y ?? 0, scale: from.scale ?? 1 }
  return {
    initial: hidden,
    animate: entered ? { opacity: 1, x: 0, y: 0, scale: 1 } : hidden,
    transition: { duration: 0.5, delay: entered ? delay : 0, ease: EASE_OUT },
  } as const
}

/** cor/variante do splash central (§4.5) — inferida do texto enviado pela engine
    (prefixos PT + EN: a engine pode trocar de idioma no meio da partida) */
function splashClasses(text: string): string {
  const t = text.toUpperCase()
  if (t.startsWith('DESPISTOU') || t.startsWith('YOU GOT AWAY') || t.startsWith('GOT AWAY'))
    return 'text-teal-neon'
  if (t.includes('SAÚDE') || t.includes('HEALTH')) return 'text-police-red'
  return 'grad-text-vice'
}

function splashGlow(text: string): string {
  const t = text.toUpperCase()
  if (t.startsWith('DESPISTOU') || t.startsWith('YOU GOT AWAY') || t.startsWith('GOT AWAY'))
    return '0 0 24px rgba(0,229,199,.55), 0 0 64px rgba(0,229,199,.25)'
  if (t.includes('SAÚDE') || t.includes('HEALTH'))
    return '0 0 24px rgba(255,59,59,.55), 0 0 64px rgba(255,59,59,.25)'
  return '0 0 24px rgba(255,46,136,.55), 0 0 64px rgba(255,46,136,.25)'
}

export default function HUD({
  hud,
  elapsedSec,
  entered,
  minimapRef,
  onPauseClick,
  onMuteClick,
}: HUDProps) {
  const { t } = useLang()

  /* dinheiro estilo odômetro (§4.1: rola 300ms ao ganhar) */
  const money = useRolledNumber(hud.money)

  /* pulso ao ganhar estrela: borda superior dourada + anel do minimapa (§4.1/§4.2).
     Padrão oficial de "estado ajustado no render" (como em WantedStars);
     o id do pulso é um contador (0 = inativo), usado como key da animação. */
  const [starPulse, setStarPulse] = useState(0)
  const [prevWanted, setPrevWanted] = useState(hud.wanted)
  if (hud.wanted !== prevWanted) {
    setPrevWanted(hud.wanted)
    if (hud.wanted > prevWanted) setStarPulse((p) => p + 1)
  }
  useEffect(() => {
    if (starPulse === 0) return
    const t = window.setTimeout(() => setStarPulse(0), 1400)
    return () => window.clearTimeout(t)
  }, [starPulse])

  /* flash branco 150ms na barra de vida ao tomar dano (§4.3) */
  const [dmgFlash, setDmgFlash] = useState(0)
  const [prevHealth, setPrevHealth] = useState(hud.health)
  if (hud.health !== prevHealth) {
    setPrevHealth(hud.health)
    if (hud.health < prevHealth) setDmgFlash((p) => p + 1)
  }
  useEffect(() => {
    if (dmgFlash === 0) return
    const t = window.setTimeout(() => setDmgFlash(0), 220)
    return () => window.clearTimeout(t)
  }, [dmgFlash])

  /* toast some em 2.4s (design.md §8.8) mesmo que a engine segure a string */
  const [toast, setToast] = useState<string | null>(null)
  const [prevToastProp, setPrevToastProp] = useState(hud.toast)
  if (hud.toast !== prevToastProp) {
    setPrevToastProp(hud.toast)
    setToast(hud.toast)
  }
  useEffect(() => {
    if (toast == null) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  /* aria-live throttled 1s (game.md §9): leitores de tela acompanham o HUD */
  const hudRef = useRef(hud)
  const elapsedRef = useRef(elapsedSec)
  const tRef = useRef(t)
  useEffect(() => {
    hudRef.current = hud
    elapsedRef.current = elapsedSec
    tRef.current = t
  })
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    const id = window.setInterval(() => {
      const h = hudRef.current
      const d = tRef.current.game.hud
      const partes = [
        d.srHealth(Math.round(h.health)),
        d.srMoney(Math.round(h.money).toLocaleString(tRef.current.locale)),
        h.wanted > 0 ? d.srWanted(h.wanted, h.evading) : d.srNoWanted,
        h.inVehicle ? d.srSpeed(Math.round(h.speedKmh)) : d.srOnFoot,
        d.srTime(formatClock(elapsedRef.current)),
      ]
      setAnnounce(partes.join(' '))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const healthPct = Math.max(0, Math.min(100, hud.health))
  const lowHealth = healthPct > 0 && healthPct < 25
  const speed = Math.round(hud.speedKmh)
  const speedColor =
    speed > 180 ? 'text-police-red' : speed > 140 ? 'text-sunset-orange' : 'text-text-hi'

  return (
    <>
      {/* ================= barra superior (§4.1) ================= */}
      <div className="pointer-events-none fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-20 flex items-start justify-between lg:inset-x-5 lg:top-[max(20px,env(safe-area-inset-top))]">
        {/* dinheiro (top-left) */}
        <motion.div
          {...enter(entered, 0, { x: -24 })}
          className="flex items-baseline gap-2"
        >
          <span className="font-pixel text-[10px] text-text-dim">R$</span>
          <span
            className="font-sans text-2xl font-bold tabular-nums text-cash-green"
            style={{ textShadow: '0 0 12px rgba(124,255,107,.4)' }}
          >
            {Math.round(money).toLocaleString(t.locale)}
          </span>
        </motion.div>

        {/* estrelas (top-center) */}
        <motion.div
          {...enter(entered, 0.1, { y: -16 })}
          className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
        >
          <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
            {t.game.hud.wanted}
          </span>
          <div className={cn(hud.wanted === 0 && !hud.evading && 'opacity-25')}>
            <WantedStars level={hud.wanted} size={28} evading={hud.evading} />
          </div>
          {/* tempo no mobile: top-center abaixo das estrelas (§8) */}
          <div className="mt-1 flex items-center gap-1.5 lg:hidden">
            <span className="font-pixel text-[8px] text-text-dim">{t.game.hud.time}</span>
            <span className="font-sans text-sm font-bold tabular-nums text-text-hi">
              {formatClock(elapsedSec)}
            </span>
          </div>
          {/* objetivo da missão (entrega): pill dourada pulsando */}
          {hud.objective && (
            <div className="gm-objective mt-2 flex items-center gap-1.5 rounded-full border border-[rgba(255,214,10,0.7)] bg-[rgba(13,6,24,0.72)] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD60A]" />
              <span className="font-pixel text-[8px] uppercase tracking-[0.08em] text-[#FFE88A]">
                {hud.objective}
              </span>
            </div>
          )}
        </motion.div>

        {/* tempo + ações (top-right) */}
        <motion.div
          {...enter(entered, 0.2, { x: 24 })}
          className="pointer-events-auto flex items-center gap-2"
        >
          <div className="mr-1 hidden items-baseline gap-2 lg:flex">
            <span className="font-pixel text-[9px] text-text-dim">{t.game.hud.time}</span>
            <span className="font-sans text-xl font-bold tabular-nums text-text-hi">
              {formatClock(elapsedSec)}
            </span>
          </div>
          {/* crédito Kimi sempre ativo na janela do jogo */}
          <a
            href="https://www.kimi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gm-hud-icon-btn"
            aria-label={t.footer.kimi}
            title={t.footer.kimi}
          >
            <img src="./kimi-k.svg" alt="" className="h-[18px] w-[18px]" aria-hidden="true" />
          </a>
          <button
            type="button"
            className="gm-hud-icon-btn"
            onClick={onPauseClick}
            aria-label={t.game.hud.pauseAria}
          >
            <Pause size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gm-hud-icon-btn"
            onClick={onMuteClick}
            aria-label={hud.muted ? t.game.hud.unmuteAria : t.game.hud.muteAria}
            aria-pressed={hud.muted}
          >
            {hud.muted ? (
              <VolumeX size={18} aria-hidden="true" />
            ) : (
              <Volume2 size={18} aria-hidden="true" />
            )}
          </button>
        </motion.div>
      </div>

      {/* ================= minimapa (§4.2) — engine desenha no canvas ========= */}
      <motion.div
        {...enter(entered, 0.3, { scale: 0.8 })}
        className="pointer-events-none fixed right-3 top-16 z-20 lg:bottom-5 lg:left-5 lg:right-auto lg:top-auto"
      >
        <div
          className={cn(
            'grad-vice rounded-full p-[2px] shadow-[0_0_24px_rgba(255,46,136,.18)]',
            starPulse > 0 && 'gm-minimap-flash',
          )}
        >
          <div className="overflow-hidden rounded-full bg-night-900/85">
            <canvas
              ref={minimapRef}
              width={180}
              height={180}
              className="block h-[120px] w-[120px] lg:h-[180px] lg:w-[180px]"
              aria-label={t.game.hud.minimapAria}
            />
          </div>
        </div>
      </motion.div>

      {/* ================= velocímetro + vida (§4.3, bottom-right) =========== */}
      <motion.div
        {...enter(entered, 0.4, { y: 24 })}
        className="pointer-events-none fixed bottom-[176px] right-3 z-20 flex flex-col items-end gap-2 lg:bottom-5 lg:right-5"
      >
        <AnimatePresence mode="wait" initial={false}>
          {hud.inVehicle ? (
            <motion.div
              key="velocimetro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-end"
            >
              <span
                className={cn(
                  'font-sans text-[44px] font-bold leading-none tabular-nums',
                  speedColor,
                  speed > 140 && 'gm-speed-jitter',
                )}
              >
                {speed}
              </span>
              <span className="mt-1 font-pixel text-[10px] text-text-dim">KM/H</span>
            </motion.div>
          ) : (
            <motion.span
              key="a-pe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon"
            >
              {t.game.hud.onFoot}
            </motion.span>
          )}
        </AnimatePresence>

        <div className="mt-1 flex flex-col items-end gap-1">
          <span className="font-pixel text-[9px] text-text-dim">{t.game.hud.health}</span>
          <div
            className="relative h-2.5 w-40 overflow-hidden rounded-full"
            style={{ background: 'rgba(201,184,232,.15)' }}
            role="progressbar"
            aria-label={t.game.hud.healthBarAria}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(healthPct)}
          >
            <div
              className={cn('h-full rounded-full', lowHealth && 'gm-health-pulse')}
              style={{
                width: `${healthPct}%`,
                backgroundImage: 'linear-gradient(90deg,#FF2E88 0%,#FF7A29 55%,#FF4757 100%)',
                transition: 'width 200ms ease',
              }}
            />
            {dmgFlash > 0 && (
              <div key={dmgFlash} className="gm-health-flash absolute inset-0 bg-white" />
            )}
          </div>
        </div>
      </motion.div>

      {/* ================= dica contextual (§4.4, bottom-center) ============= */}
      <div className="pointer-events-none fixed inset-x-0 bottom-36 z-20 flex justify-center px-4 lg:bottom-6">
        <AnimatePresence mode="wait">
          {hud.hint && (
            <motion.div
              key={hud.hint}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="gm-pill gm-pill-teal"
              role="status"
            >
              {hud.hint}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= toasts (design.md §8.8) ========================== */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[196px] z-20 flex flex-col items-center gap-2 px-4 lg:bottom-20">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className={cn('gm-pill', toast.includes('R$') ? 'gm-pill-gold' : 'gm-pill-teal')}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= splash central (§4.5) ============================ */}
      <div className="pointer-events-none fixed inset-x-0 top-[38%] z-30 flex justify-center px-6">
        <AnimatePresence mode="wait">
          {hud.splash && (
            <motion.div
              key={hud.splash.text + (hud.splash.sub ?? '')}
              initial={{ scale: 2.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              transition={{ duration: 0.35, ease: EASE_SLAM }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span
                className={cn(
                  'font-display text-[clamp(40px,7vw,56px)] uppercase leading-none tracking-[0.01em]',
                  splashClasses(hud.splash.text),
                )}
                style={{ textShadow: splashGlow(hud.splash.text) }}
              >
                {hud.splash.text}
              </span>
              {hud.splash.sub && (
                <span className="font-pixel text-[10px] uppercase tracking-[0.08em] text-text-mid">
                  {hud.splash.sub}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= overlays de feedback ============================= */}
      {/* pulso dourado na borda superior ao ganhar estrela (§4.1) */}
      {starPulse > 0 && (
        <div
          key={starPulse}
          aria-hidden="true"
          className="gm-gold-top pointer-events-none fixed inset-x-0 top-0 z-[16] h-[3px]"
          style={{
            background: 'linear-gradient(90deg, transparent, #FFD60A, transparent)',
            boxShadow: '0 0 16px rgba(255,214,10,.6), 0 0 48px rgba(255,214,10,.25)',
          }}
        />
      )}
      {/* reflexo policial nas bordas (§2.3): wanted >= 3 */}
      {hud.wanted >= 3 && !hud.gameOver && (
        <div aria-hidden="true" className="gm-police-edges pointer-events-none fixed inset-0 z-[14]" />
      )}
      {/* vignette de dano abaixo de 25% de vida (§4.3) */}
      {lowHealth && !hud.gameOver && (
        <div aria-hidden="true" className="gm-damage-vignette pointer-events-none fixed inset-0 z-[14]" />
      )}

      {/* leitura de tela (§9) */}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </>
  )
}
