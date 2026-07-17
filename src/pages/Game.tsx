import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
// A engine é entregue por outro agente em src/game/engine.ts, seguindo o
// contrato src/game/types.ts (CreateGame). O import quebra o tsc até o merge —
// esperado.
import { createGame } from '@/game/engine'
import type { GameHandle, GameOverPayload, HudState } from '@/game/types'
import { useLang } from '@/i18n'
import HUD from '@/components/game/HUD'
import PauseMenu from '@/components/game/PauseMenu'
import GameOverOverlay from '@/components/game/GameOverOverlay'
import TouchControls from '@/components/game/TouchControls'
import { RotateHint } from '@/components/game/RotateHint'
import { useReducedMotionPref } from '@/components/game/hooks'
import { cn } from '@/lib/utils'
import '@/components/game/game-ui.css'

/* ============================================================================
   /jogar — game.md. Canvas fullscreen (sem scroll, overflow hidden,
   touch-action none, fundo night-950) + HUD em DOM. A engine roda em um
   único useEffect (createGame({canvas, minimap, onHud}) → destroy no
   unmount). Entrada: fade de night-950 400ms → canvas scale 1.04→1 600ms →
   HUD em stagger. ESC pausa/retoma (countdown 3·2·1), M mudo, R reinicia no
   game over.
   ========================================================================== */

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]

/** HUD inicial antes do primeiro onHud da engine (tela de load) */
const DEFAULT_HUD: HudState = {
  health: 100,
  money: 0,
  wanted: 0,
  evading: false,
  speedKmh: 0,
  inVehicle: false,
  splash: null,
  toast: null,
  hint: null,
  objective: null,
  paused: false,
  muted: false,
  crt: false,
  gameOver: null,
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<GameHandle | null>(null)

  const [hud, setHud] = useState<HudState>(DEFAULT_HUD)
  const [ready, setReady] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  /** countdown 3·2·1 ao retomar (game.md §6); null = sem countdown */
  const [resuming, setResuming] = useState<number | null>(null)
  /** game over local do "Desistir da fuga" (game.md §6 → DETIDO) */
  const [surrenderOver, setSurrenderOver] = useState<GameOverPayload | null>(null)

  const reduceMotion = useReducedMotionPref()
  const { lang, t } = useLang()

  const hudRef = useRef(hud)
  const elapsedRef = useRef(elapsedSec)
  const resumingRef = useRef(resuming)
  const surrenderRef = useRef(surrenderOver)
  const tRef = useRef(t)
  useEffect(() => {
    hudRef.current = hud
    elapsedRef.current = elapsedSec
    resumingRef.current = resuming
    surrenderRef.current = surrenderOver
    tRef.current = t
  })
  const maxWantedRef = useRef(0)

  const gameOver: GameOverPayload | null = surrenderOver ?? hud.gameOver
  const gameOverNow = () => surrenderRef.current != null || hudRef.current.gameOver != null

  /* ---------------- ciclo de vida da engine (único useEffect) ------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const minimap = minimapRef.current
    if (!canvas || !minimap) return

    const handle = createGame({
      canvas,
      minimap,
      onHud: (h: HudState) => setHud(h),
    })
    handleRef.current = handle

    /* loading breve: revela canvas (scale 1.04→1) e libera a entrada do HUD */
    const t = window.setTimeout(() => setReady(true), 700)
    canvas.focus()

    return () => {
      window.clearTimeout(t)
      handle.destroy()
      handleRef.current = null
    }
  }, [])

  /* ---------------- idioma da engine (splash/toast/hint/cause) ------------ */
  useEffect(() => {
    handleRef.current?.setLanguage?.(lang)
  }, [lang])

  /* ---------------- anti scroll / pull-to-refresh / gestos --------------- */
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    /* iOS: pinch-zoom por gesto */
    const preventGesture = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', preventGesture)
    document.addEventListener('gesturechange', preventGesture)

    /* Scroll/zoom bloqueados via CSS: .game-root { touch-action: none }.
       NUNCA usar preventDefault em touchmove aqui — no Chrome Android isso
       cancela o click sintético e mata TODOS os botões (pause, voltar, HUD).
       Áreas roláveis usam [data-allow-scroll] { touch-action: pan-y }. */

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.overscrollBehavior = prev.bodyOverscroll
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
    }
  }, [])

  /* ---------------- procurado máximo visto (stats do "Desistir") ---------- */
  useEffect(() => {
    if (hud.wanted > maxWantedRef.current) maxWantedRef.current = hud.wanted
  }, [hud.wanted])

  /* ---------------- relógio da corrida (HudState não traz tempo) ---------- */
  const clockRunning =
    ready && !hud.paused && !hud.gameOver && surrenderOver == null && resuming == null
  useEffect(() => {
    if (!clockRunning) return
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [clockRunning])

  /* ---------------- ações -------------------------------------------------- */
  const startResume = useCallback(() => {
    if (reduceMotion) {
      /* prefers-reduced-motion: sem countdown, retoma direto */
      handleRef.current?.resume()
      canvasRef.current?.focus()
      return
    }
    setResuming(3)
  }, [reduceMotion])

  /* countdown 3·2·1 (200ms cada, game.md §6) → resume */
  useEffect(() => {
    if (resuming == null) return
    const t = window.setTimeout(() => {
      if (resuming <= 1) {
        handleRef.current?.resume()
        setResuming(null)
        canvasRef.current?.focus()
      } else {
        setResuming(resuming - 1)
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [resuming])

  const togglePause = useCallback(() => {
    if (gameOverNow() || resumingRef.current != null) return
    if (hudRef.current.paused) startResume()
    else handleRef.current?.pause()
  }, [startResume])

  const restart = useCallback(() => {
    handleRef.current?.restart()
    handleRef.current?.resume() // garante saída do pause (no-op se já correndo)
    setSurrenderOver(null)
    setResuming(null)
    maxWantedRef.current = 0
    setElapsedSec(0)
    canvasRef.current?.focus()
  }, [])

  const toggleMute = useCallback(() => handleRef.current?.toggleMute(), [])
  const toggleCrt = useCallback(() => handleRef.current?.toggleCrt(), [])
  const onTouchInput = useCallback(
    (t: Parameters<GameHandle['setTouchInput']>[0]) => handleRef.current?.setTouchInput(t),
    [],
  )

  /* "Desistir da fuga" (game.md §6): se entregar → game over DETIDO.
     O contrato GameHandle não expõe surrender(), então a UI monta o payload
     com o que enxerga (dinheiro/tempo/procurado máximo local). */
  const surrender = useCallback(() => {
    // Caminho preferido: a ENGINE resolve (pausa áudio, stats reais, fase gameover)
    if (handleRef.current?.surrender) {
      handleRef.current.surrender()
      return
    }
    // Fallback local: fabrica o payload E pausa a engine — senão o jogo
    // (e o motor do áudio) continuam rodando atrás do overlay.
    handleRef.current?.pause()
    const h = hudRef.current
    const timeSec = elapsedRef.current
    const money = h.money
    let bestMoney = 0
    let bestTime = 0
    try {
      bestMoney = Number(window.localStorage.getItem('gtamini.recorde.dinheiro') ?? 0) || 0
      bestTime = Number(window.localStorage.getItem('gtamini.recorde.tempo') ?? 0) || 0
    } catch {
      /* storage indisponível */
    }
    const isRecord = money > bestMoney || timeSec > bestTime
    try {
      if (money > bestMoney)
        window.localStorage.setItem('gtamini.recorde.dinheiro', String(money))
      if (timeSec > bestTime) window.localStorage.setItem('gtamini.recorde.tempo', String(timeSec))
    } catch {
      /* storage indisponível */
    }
    setSurrenderOver({
      kind: 'busted',
      cause: tRef.current.game.surrenderCause,
      stats: {
        timeSec,
        moneyEarned: money,
        carsStolen: 0,
        maxWanted: Math.max(maxWantedRef.current, h.wanted),
        distanceKm: 0,
        score: money,
      },
      best: Math.max(bestMoney, bestTime),
      isRecord,
    })
  }, [])

  /* ---------------- teclado global da UI: ESC / M / R ---------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (gameOverNow()) return // game-over.md §1: ESC não fecha o overlay
        togglePause()
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute()
      } else if (e.key === 'r' || e.key === 'R') {
        if (gameOverNow()) restart() // game-over.md §5: R = Jogar Novamente
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause, toggleMute, restart])

  const overlayOpen = hud.paused || gameOver != null

  return (
    <div ref={rootRef} className="game-root" onContextMenu={(e) => e.preventDefault()}>
      {/* ---------------- canvas principal (engine desenha) ---------------- */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="h-full w-full"
          initial={{ scale: 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <canvas
            ref={canvasRef}
            tabIndex={overlayOpen ? -1 : 0}
            aria-label={t.game.canvasAria}
            className={cn(
              'game-crosshair block focus-visible:outline-none',
              gameOver ? 'gm-canvas-over' : 'gm-canvas-live',
            )}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              touchAction: 'none',
            }}
          />
        </motion.div>
      </motion.div>

      {/* ---------------- loading state breve (fade de night-950 400ms) ----- */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="loading"
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-night-950"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="grad-text-vice font-display text-4xl uppercase leading-none tracking-[0.01em] sm:text-5xl">
              GTA VI Mini
            </span>
            <span className="animate-pulse font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon">
              {t.game.loading}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- HUD (DOM sobre o canvas) -------------------------- */}
      <HUD
        hud={hud}
        elapsedSec={elapsedSec}
        entered={ready}
        minimapRef={minimapRef}
        onPauseClick={togglePause}
        onMuteClick={toggleMute}
      />

      {/* ---------------- controles touch (pointer: coarse) ----------------- */}
      <RotateHint />
      {!overlayOpen && <TouchControls inVehicle={hud.inVehicle} onInput={onTouchInput} />}

      {/* ---------------- menu de pausa (ESC) -------------------------------- */}
      <PauseMenu
        open={hud.paused && resuming == null && gameOver == null}
        muted={hud.muted}
        crt={hud.crt}
        onResume={startResume}
        onRestart={restart}
        onToggleMute={toggleMute}
        onToggleCrt={toggleCrt}
        onSurrender={surrender}
      />

      {/* ---------------- countdown 3·2·1 ao retomar (§6) -------------------- */}
      <AnimatePresence>
        {resuming != null && resuming > 0 && (
          <motion.div
            key="countdown"
            className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <span
              key={resuming}
              className="gm-countdown-pop font-pixel text-6xl text-teal-neon sm:text-7xl"
              style={{ textShadow: '0 0 24px rgba(0,229,199,.6), 0 0 64px rgba(0,229,199,.25)' }}
            >
              {resuming}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- game over (DETIDO / SE DEU MAL) -------------------- */}
      <GameOverOverlay payload={gameOver} onRestart={restart} />

      {/* ---------------- scanlines do Modo CRT (§8.9) — por cima de tudo ---- */}
      {hud.crt && (
        <div
          aria-hidden="true"
          className="scanlines-overlay pointer-events-none fixed inset-0 z-[70] opacity-50"
        />
      )}
    </div>
  )
}
