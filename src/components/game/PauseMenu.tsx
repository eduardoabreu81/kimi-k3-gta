import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import KeyCap from '@/components/KeyCap'
import { Switch } from '@/components/ui/switch'

/* ============================================================================
   PauseMenu — game.md §6. Overlay fullscreen com blur, painel central
   (max 520px, night-800, radius 20px, glow rosa), título PAUSADO com glitch
   RGB, botões em coluna, resumo de controles com keycaps mini e toggles
   (Som, Modo CRT, Vibração, Reduzir movimento). ESC retoma (via Game.tsx).
   ========================================================================== */

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]

const CONTROLS: Array<{ keys: string[]; label: string; wide?: boolean }> = [
  { keys: ['WASD'], label: 'DIRIGIR/ANDAR', wide: true },
  { keys: ['E'], label: 'ENTRAR/SAIR' },
  { keys: ['ESPAÇO'], label: 'FREIO DE MÃO', wide: true },
  { keys: ['SHIFT'], label: 'CORRER', wide: true },
  { keys: ['M'], label: 'SOM' },
  { keys: ['ESC'], label: 'PAUSAR', wide: true },
]

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
          aria-label="Jogo pausado"
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
              data-text="PAUSADO"
              className="gm-glitch gm-glitch-idle grad-text-vice text-center font-display text-[clamp(40px,6vw,72px)] uppercase leading-none tracking-[0.01em]"
            >
              PAUSADO
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
                  Continuar
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
              >
                <button type="button" className="btn-secondary w-full" onClick={onRestart}>
                  Reiniciar
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
                  onClick={() => window.open('/como-jogar', '_blank', 'noopener')}
                >
                  Como Jogar
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
                className="flex justify-center pt-1"
              >
                <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
                  Voltar ao Início
                </button>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                whileHover={{ x: 4 }}
              >
                <button type="button" className="btn-danger w-full" onClick={onSurrender}>
                  Desistir da fuga
                </button>
              </motion.div>
            </motion.div>

            {/* toggles (§6): Som, Modo CRT, Vibração, Reduzir movimento */}
            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-violet-haze/60 pt-5 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  Som
                </span>
                <Switch
                  checked={!muted}
                  onCheckedChange={(v) => {
                    if (v === muted) onToggleMute()
                  }}
                  aria-label="Som ligado ou desligado (M)"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  Modo CRT
                </span>
                <Switch
                  checked={crt}
                  onCheckedChange={() => onToggleCrt()}
                  aria-label="Modo CRT (scanlines)"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  Vibração
                </span>
                <Switch
                  checked={vibrate}
                  onCheckedChange={toggleVibrate}
                  aria-label="Vibração em dispositivos móveis"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-pixel text-[9px] uppercase tracking-[0.08em] text-text-dim">
                  Reduzir movimento
                </span>
                <Switch
                  checked={reduceMotion}
                  onCheckedChange={toggleReduceMotion}
                  aria-label="Reduzir movimento"
                />
              </label>
            </div>

            {/* resumo de controles (§6): 2 colunas, keycaps mini + labels pixel 9px */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-violet-haze/60 pt-5">
              {CONTROLS.map((c) => (
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
              ESC — CONTINUAR
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
