import { useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TouchInput } from '@/game/types'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'
import { useCoarsePointer } from './hooks'

/* ============================================================================
   TouchControls — D-pad de 4 direcionais (▲▼◀▶) bottom-left, MESMO esquema
   a pé e dirigindo (pedido do usuário: "apenas os direcionais, da mesma
   forma que controlamos o humano") + botões bottom-right: E/AÇÃO (72px,
   primário) e FREIO (64px, só dirigindo). Cada botão captura seu próprio
   pointer → multi-touch funciona (andar + frear ao mesmo tempo). Tudo vira
   handle.setTouchInput() com estado mesclado.
   ========================================================================== */

const DPAD = 54 // px por botão direcional (alvo touch ≥ 44px)
const GAP = 6 // px entre botões do D-pad

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

type DirKey = 'up' | 'down' | 'left' | 'right'

const ARROWS: Record<DirKey, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
}

export default function TouchControls({ inVehicle, onInput }: TouchControlsProps) {
  const { t } = useLang()
  const coarse = useCoarsePointer()

  /* estado mesclado de todos os ponteiros (D-pad + botões) */
  const inputRef = useRef<TouchInput>({})
  const emit = useCallback(
    (patch: Partial<TouchInput>) => {
      inputRef.current = { ...inputRef.current, ...patch }
      onInput({ ...inputRef.current })
    },
    [onInput],
  )

  const press = (key: keyof TouchInput, down: boolean) => {
    if (down) vibrate(10)
    emit({ [key]: down } as Partial<TouchInput>)
  }

  if (!coarse) return null

  const dirBtn = (key: DirKey, aria: string) => (
    <button
      key={key}
      type="button"
      aria-label={aria}
      className={cn(
        'gm-dpad-btn flex items-center justify-center rounded-xl border border-teal-neon/60',
        'bg-[rgba(13,6,24,0.55)] text-teal-neon backdrop-blur-[2px]',
        'active:scale-95 active:border-teal-neon active:bg-[rgba(0,229,199,0.18)]',
      )}
      style={{ width: DPAD, height: DPAD, touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        press(key, true)
      }}
      onPointerUp={() => press(key, false)}
      onPointerCancel={() => press(key, false)}
      onLostPointerCapture={() => press(key, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="pointer-events-none text-base leading-none">{ARROWS[key]}</span>
    </button>
  )

  return (
    <>
      {/* D-pad (bottom-left): mesma leitura a pé e no carro */}
      <div
        role="group"
        aria-label={t.game.touch.dpadGroup}
        className="fixed left-3 z-20 grid"
        style={{
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          gridTemplateColumns: `repeat(3, ${DPAD}px)`,
          gridTemplateRows: `repeat(3, ${DPAD}px)`,
          gap: GAP,
        }}
      >
        <div style={{ gridColumn: 2, gridRow: 1 }}>{dirBtn('up', t.game.touch.dUp)}</div>
        <div style={{ gridColumn: 1, gridRow: 2 }}>{dirBtn('left', t.game.touch.dLeft)}</div>
        <div style={{ gridColumn: 3, gridRow: 2 }}>{dirBtn('right', t.game.touch.dRight)}</div>
        <div style={{ gridColumn: 2, gridRow: 3 }}>{dirBtn('down', t.game.touch.dDown)}</div>
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
