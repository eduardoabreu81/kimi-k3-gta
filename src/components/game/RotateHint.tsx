import { useEffect, useState } from 'react'
import { useLang } from '../../i18n'
import { useCoarsePointer } from './hooks'

/** Sugere girar o celular para paisagem (só touch + retrato, 1x por sessão). */
export function RotateHint() {
  const { t } = useLang()
  const coarse = useCoarsePointer()
  const [portrait, setPortrait] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('gtamini.rotateDismiss') === '1',
  )

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const update = () => setPortrait(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!coarse || !portrait || dismissed) return null

  return (
    <div className="gm-rotate-hint" role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M17 1.5l3 3-3 3" />
        <path d="M20 4.5h-6" />
      </svg>
      <div className="txt">
        <span className="t1">{t.game.touch.rotateTitle}</span>
        <span className="t2">{t.game.touch.rotateSub}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem('gtamini.rotateDismiss', '1')
          setDismissed(true)
        }}
      >
        {t.game.touch.rotateDismiss}
      </button>
    </div>
  )
}
