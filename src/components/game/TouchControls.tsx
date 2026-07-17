import { useCallback, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TouchInput } from '@/game/types'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'
import { useCoarsePointer } from './hooks'

/* ============================================================================
   TouchControls — game.md §8. Só aparece com pointer: coarse (escondido em
   desktop). Joystick virtual bottom-left (base 112px, thumb 48px grad-vice)
   + botões de ação bottom-right em coluna: E/AÇÃO (72px, primário) e FREIO
   (64px, secundário, só quando dirigindo). Tudo vira handle.setTouchInput()
   (mesclado: joystick + botões convivem em multi-touch).
   ========================================================================== */

const BASE = 112 // px
const THUMB = 48 // px
const MAX_OFFSET = (BASE - THUMB) / 2 // 32px de curso do thumb
const DEAD_ZONE = 12 // px — abaixo disso, neutro

export interface TouchControlsProps {
  inVehicle: boolean
  onInput: (t: TouchInput) => void
}

function vibrate(ms: number) {
  try {
    if (window.localStorage.getItem('gtamini.cfg.vibracao') === '0') return
    navigator.vibrate?.(ms)
  } catch {
    /* ignora */
  }
}

export default function TouchControls({ inVehicle, onInput }: TouchControlsProps) {
  const { t } = useLang()
  const coarse = useCoarsePointer()

  /* estado mesclado de todos os ponteiros (joystick + botões) */
  const inputRef = useRef<TouchInput>({})
  const emit = useCallback(
    (patch: Partial<TouchInput>) => {
      inputRef.current = { ...inputRef.current, ...patch }
      onInput({ ...inputRef.current })
    },
    [onInput],
  )

  /* ---------------- joystick ---------------- */
  const baseRef = useRef<HTMLDivElement>(null)
  const joyPointer = useRef<number | null>(null)
  const [thumb, setThumb] = useState({ x: 0, y: 0 })

  const updateJoystick = (e: ReactPointerEvent<HTMLDivElement>) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > MAX_OFFSET) {
      dx = (dx / len) * MAX_OFFSET
      dy = (dy / len) * MAX_OFFSET
    }
    setThumb({ x: dx, y: dy })
    emit({
      up: dy < -DEAD_ZONE,
      down: dy > DEAD_ZONE,
      left: dx < -DEAD_ZONE,
      right: dx > DEAD_ZONE,
    })
  }

  const releaseJoystick = () => {
    joyPointer.current = null
    setThumb({ x: 0, y: 0 })
    emit({ up: false, down: false, left: false, right: false })
  }

  /* ---------------- botões ---------------- */
  const press = (key: 'action' | 'brake', down: boolean) => {
    if (down) vibrate(10)
    emit({ [key]: down } as Partial<TouchInput>)
  }

  if (!coarse) return null

  return (
    <>
      {/* joystick virtual (bottom-left) */}
      <div
        ref={baseRef}
        role="application"
        aria-label={t.game.touch.joystickAria}
        className="gm-joystick-base fixed left-3 z-20"
        style={{
          width: BASE,
          height: BASE,
          bottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
        onPointerDown={(e) => {
          if (joyPointer.current != null) return
          joyPointer.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          updateJoystick(e)
        }}
        onPointerMove={(e) => {
          if (joyPointer.current !== e.pointerId) return
          updateJoystick(e)
        }}
        onPointerUp={(e) => {
          if (joyPointer.current === e.pointerId) releaseJoystick()
        }}
        onPointerCancel={(e) => {
          if (joyPointer.current === e.pointerId) releaseJoystick()
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="gm-joystick-thumb"
          style={{
            width: THUMB,
            height: THUMB,
            transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))`,
          }}
        />
      </div>

      {/* botões de ação (bottom-right, coluna) */}
      <div
        className="fixed right-3 z-20 flex flex-col items-center gap-3"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence>
          {inVehicle && (
            <motion.button
              key="freio"
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              aria-label={t.game.touch.brakeAria}
              className={cn(
                'flex items-center justify-center rounded-full border border-teal-neon font-pixel text-[9px] uppercase tracking-[0.08em] text-teal-neon',
                'bg-transparent active:scale-95 active:bg-[rgba(0,229,199,.12)]',
              )}
              style={{ width: 64, height: 64, touchAction: 'none' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                press('brake', true)
              }}
              onPointerUp={() => press('brake', false)}
              onPointerCancel={() => press('brake', false)}
              onLostPointerCapture={() => press('brake', false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {t.game.touch.brake}
            </motion.button>
          )}
        </AnimatePresence>

        <button
          type="button"
          aria-label={inVehicle ? t.game.touch.exitCarAria : t.game.touch.enterCarAria}
          className="grad-vice flex flex-col items-center justify-center rounded-full font-pixel text-night-950 shadow-[0_0_24px_rgba(255,46,136,.45),0_0_80px_rgba(255,46,136,.18)] active:scale-95"
          style={{ width: 72, height: 72, touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            press('action', true)
          }}
          onPointerUp={() => press('action', false)}
          onPointerCancel={() => press('action', false)}
          onLostPointerCapture={() => press('action', false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="text-base leading-none">E</span>
          <span className="mt-1 text-[7px] uppercase tracking-[0.08em]">
            {inVehicle ? t.game.touch.exit : t.game.touch.enter}
          </span>
        </button>
      </div>
    </>
  )
}
