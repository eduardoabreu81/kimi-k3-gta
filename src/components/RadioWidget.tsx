import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { Pause, Play, Radio as RadioIcon, SkipForward } from 'lucide-react'
import { STATION_IDS, initRadioGestures, radio, useRadio } from '@/lib/music'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

/* ============================================================================
   RadioWidget — pill flutuante com as 3 estações da rádio (estilo GTA).
   Global (montada no App, fora das rotas): toca no site e no /jogar sem
   reiniciar. Botões pequenos (pedido do usuário): play/pause explícito
   (mantém estação e faixa), ELE/ROK/SYN em font-pixel (clicar na ativa
   desliga a rádio) e "pular" enquanto há estação ligada. No /jogar sobe
   para não cobrir joystick/botões touch nem o hint/toast do HUD; fica sob
   os overlays (pause/game over, z-50).
   ========================================================================== */

export default function RadioWidget() {
  const { t } = useLang()
  const state = useRadio()
  const { pathname } = useLocation()
  const inGame = pathname.startsWith('/jogar')

  /* autoplay dos navegadores: destrava o áudio no primeiro gesto */
  useEffect(() => initRadioGestures(), [])

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30 flex justify-center',
        inGame
          ? 'bottom-[76px] translate-x-3 lg:bottom-[136px] lg:translate-x-0'
          : 'bottom-[max(12px,env(safe-area-inset-bottom))]',
      )}
    >
      <div
        role="group"
        aria-label={t.radio.groupAria}
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-night-700 bg-night-950/85 px-1.5 py-1 shadow-[0_0_18px_rgba(0,0,0,.45)] backdrop-blur-sm"
      >
        <RadioIcon
          size={13}
          aria-hidden="true"
          className={cn('mx-0.5 shrink-0', state.playing ? 'text-teal-neon' : 'text-text-dim')}
        />
        {/* play/pause explícito — pausar mantém estação e faixa (não desliga) */}
        {state.station && (
          <button
            type="button"
            onClick={() => (state.playing ? radio.pause() : radio.resume())}
            aria-label={state.playing ? t.radio.pauseAria : t.radio.playAria}
            title={state.playing ? t.radio.pauseAria : t.radio.playAria}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
              state.playing
                ? 'text-teal-neon hover:text-text-hi'
                : 'text-text-dim hover:text-teal-neon',
            )}
          >
            {state.playing ? (
              <Pause size={13} aria-hidden="true" />
            ) : (
              <Play size={13} aria-hidden="true" />
            )}
          </button>
        )}
        {state.trackName && (
          <span
            className={cn(
              'mr-0.5 hidden max-w-[130px] truncate font-sans text-[11px] text-text-mid md:inline',
              !state.playing && 'opacity-60',
            )}
          >
            {state.trackName}
          </span>
        )}
        {STATION_IDS.map((id) => {
          const empty = state.counts[id] === 0
          const active = state.station === id
          const meta = t.radio.stations[id]
          return (
            <button
              key={id}
              type="button"
              disabled={empty}
              onClick={() => radio.setStation(id)}
              aria-pressed={active}
              aria-label={meta.aria}
              title={
                empty
                  ? `${meta.name} — ${t.radio.empty}`
                  : active
                    ? `${meta.name} — ${t.radio.offHint}`
                    : meta.name
              }
              className={cn(
                'min-w-[34px] rounded-full px-1.5 py-1.5 font-pixel text-[8px] uppercase leading-none tracking-[0.06em] transition-colors',
                active
                  ? 'bg-teal-neon/15 text-teal-neon shadow-[0_0_12px_rgba(0,229,199,.35)]'
                  : 'text-text-dim hover:text-text-hi',
                empty && 'cursor-not-allowed opacity-40 hover:text-text-dim',
              )}
            >
              {meta.label}
            </button>
          )
        })}
        {state.station && (
          <button
            type="button"
            onClick={() => radio.next()}
            aria-label={t.radio.skipAria}
            title={t.radio.skipAria}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim transition-colors hover:text-teal-neon"
          >
            <SkipForward size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
