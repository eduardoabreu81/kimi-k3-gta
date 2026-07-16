import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import KeyCap from '@/components/KeyCap'
import LangToggle from '@/components/LangToggle'
import { Switch } from '@/components/ui/switch'
import { useLang } from '@/i18n'

/* ============================================================================
   PauseMenu — game.md §6. Overlay fullscreen com blur, painel central
   (max 520px, night-800, radius 20px, glow rosa), título PAUSADO com glitch
   RGB, botões em coluna, resumo de controles com keycaps mini e toggles
   (Som, Modo CRT, Vibração, Reduzir movimento). ESC retoma (via Game.tsx).
   ========================================================================== */

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]

export interface PauseMenuProps {
  open: boolean
  muted: boolean
  crt: boolean
  onResume: () => void
  onRestart: () => void
  onToggleMute: () => void
  onToggleCrt: () => void
  /** "Desistir da fuga" — se entrega: vai para o game over DETIDO (game.md §6) */
  onSurrender: () => void
}

function readCfg(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key)
    return v == null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

function writeCfg(key: string, v: boolean) {
  try {
    window.localStorage.setItem(key, v ? '1' : '0')
  } catch {
    /* storage indisponível — ignora */
  }
}

export default function PauseMenu({
  open,
  muted,
  crt,
  onResume,
  onRestart,
  onToggleMute,
  onToggleCrt,
  onSurrender,
}: PauseMenuProps) {
  const { t } = useLang()
  const navigate = useNavigate()
  const continueRef = useRef<HTMLButtonElement>(null)
  const [vibrate, setVibrate] = useState(() => readCfg('gtamini.cfg.vibracao', true))
  const [reduceMotion, setReduceMotion] = useState(() =>
    readCfg('gtamini.cfg.reduzir-movimento', false),
  )

  /* foco inicial no botão primário ao abrir (game-over.md §1 — mesmo padrão) */
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => continueRef.current?.focus(), 60)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const toggleVibrate = (v: boolean) => {
    setVibrate(v)
    writeCfg('gtamini.cfg.vibracao', v)
  }
  const toggleReduceMotion = (v: boolean) => {
    setReduceMotion(v)
    writeCfg('gtamini.cfg.reduzir-movimento', v)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t.game.pause.dialogAria}
          data-allow-scroll
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          style={{ background: 'rgba(7,3,15,.85)', backdropFilter: 'blur(12px)' }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-[520px] rounded-[20px] border border-violet-haze bg-night-800 p-6 shadow-[0_0_24px_rgba(255,46,136,.45),0_0_80px_rgba(255,46,136,.18),0_16px_48px_rgba(0,0,0,.5)] sm:p-8"
          >
            {/* título com glitch sutil (§6) */}
            <h2
              data-text={t.game.pause.title}
              className="gm-glitch gm-glitch-idle grad-text-vice text-center font-display text-[clamp(40px,6vw,72px)] uppercase leading-none tracking-[0.01em]"
            >
              {t.game.pause.title}
            </h2>

            {/* botões em coluna, stagger 60ms slide-left */}
            <motion.div
              className="mt-6 flex flex-col gap-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
              }}
            >
              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
              >
                <button ref={continueRef} type="button" className="btn-primary w-full" onClick={onResume}>
                  {t.game.pause.continue}
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
              >
                <button type="button" className="btn-secondary w-full" onClick={onRestart}>
                  {t.game.pause.restart}
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
              >
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => window.open(`${import.meta.env.BASE_URL}#/como-jogar`, '_blank', 'noopener')}
                >
                  {t.game.pause.howTo}
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
                className="flex justify-center pt-1"
              >
                <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
                  {t.game.pause.backHome}
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
              >
                <button type="button" className="btn-danger w-full" onClick={onSurrender}>
                  {t.game.pause.surrender}
                </button>
              </motion.div>
            </motion.div>

            {/* toggles (§6): Som, Modo CRT, Vibração, Reduzir movimento + Idioma */}
            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-violet-haze/60 pt-5 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  {t.game.pause.sound}
                </span>
                <Switch
                  checked={!muted}
                  onCheckedChange={(v) => {
                    if (v === muted) onToggleMute()
                  }}
                  aria-label={t.game.pause.soundAria}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  {t.game.pause.crt}
                </span>
                <Switch
                  checked={crt}
                  onCheckedChange={() => onToggleCrt()}
                  aria-label={t.game.pause.crtAria}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  {t.game.pause.vibration}
                </span>
                <Switch
                  checked={vibrate}
                  onCheckedChange={toggleVibrate}
                  aria-label={t.game.pause.vibrationAria}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  {t.game.pause.reduceMotion}
                </span>
                <Switch
                  checked={reduceMotion}
                  onCheckedChange={toggleReduceMotion}
                  aria-label={t.game.pause.reduceMotionAria}
                />
              </label>
              {/* idioma — ao lado dos switches (§i18n) */}
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  {t.game.pause.language}
                </span>
                <LangToggle />
              </div>
            </div>

            {/* resumo de controles (§6): 2 colunas, keycaps mini + labels pixel 9px */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-violet-haze/60 pt-5">
              {t.game.pause.controls.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <KeyCap
                    wide={c.wide}
                    className="h-8 min-w-8 px-2 text-[10px]"
                  >
                    {c.keys[0]}
                  </KeyCap>
                  <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
              {t.game.pause.escContinue}
            </p>

            <a
              href="https://www.kimi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 opacity-70 transition-opacity hover:opacity-100"
            >
              <img src="./kimi-k.svg" alt="Kimi" className="h-3.5 w-3.5" />
              <span className="font-pixel text-[8px] uppercase tracking-[0.08em] text-text-dim">
                {t.footer.kimi}
              </span>
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
