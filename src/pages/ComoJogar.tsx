import { memo, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Ban,
  Car,
  Coins,
  Crosshair,
  Flame,
  Gauge,
  Hand,
  HeartPulse,
  Mouse,
  PersonStanding,
  Siren,
  TrafficCone,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SectionTag from '@/components/SectionTag'
import WantedStars, { STAR_PATH } from '@/components/WantedStars'
import KeyCap from '@/components/KeyCap'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useLang } from '@/i18n'
import { getLenis } from '@/lib/scroll'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const CYCLE_KEY = 'gta6mini.wantedCycled' // flag compartilhada com a home (como-jogar.md S4)
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]

/* ---------------------------------------------------------------- helpers */

function SplitChars({ text, attr }: { text: string; attr: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={i} {...{ [attr]: true }} className="inline-block will-change-transform">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  )
}

function SplitWords({ text, attr }: { text: string; attr: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} {...{ [attr]: true }} className="inline-block will-change-transform">
          {w}
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

/** KeyCap compacta para citar teclas no meio do texto (mecânicas) */
function MiniKey({ children }: { children: ReactNode }) {
  return (
    <KeyCap
      wide
      className="mx-1 h-6 min-w-6 rounded-md border-b-2 px-1.5 align-middle text-[11px]"
    >
      {children}
    </KeyCap>
  )
}

/** Pulso de glow infinito do botão final (isolado + memo — react-dev.md) */
const CtaPulse = memo(function CtaPulse({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      className="inline-block rounded-full"
      animate={
        reduce
          ? undefined
          : {
              boxShadow: [
                '0 0 24px rgba(7,3,15,0.5)',
                '0 0 44px rgba(7,3,15,0.7)',
                '0 0 24px rgba(7,3,15,0.5)',
              ],
            }
      }
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.span>
  )
})

/* ------------------------------------------- ícones do objetivo (draw-in) */

type IconProps = { className?: string }

function DrawCoin({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={cn('h-7 w-7', className)}
      aria-hidden="true"
    >
      <circle data-draw cx="14" cy="14" r="10" pathLength={1} style={{ strokeDasharray: 1 }} />
      <path
        data-draw
        d="M10 12.5 H18 M10 16.5 H15.5"
        pathLength={1}
        style={{ strokeDasharray: 1 }}
      />
    </svg>
  )
}

function DrawStar({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      className={cn('h-7 w-7', className)}
      aria-hidden="true"
    >
      <path data-draw d={STAR_PATH} pathLength={1} style={{ strokeDasharray: 1 }} />
    </svg>
  )
}

function DrawShield({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-7 w-7', className)}
      aria-hidden="true"
    >
      <path
        data-draw
        d="M14 3.5 L23 7 V14 C23 20.5 19 24.5 14 26 C9 24.5 5 20.5 5 14 V7 Z"
        pathLength={1}
        style={{ strokeDasharray: 1 }}
      />
      <path data-draw d="M10 14 L13 17 L18.5 11" pathLength={1} style={{ strokeDasharray: 1 }} />
    </svg>
  )
}

/* ------------------------------------------------------------------ dados */

type ControlPart = { caps: string[]; join?: string }
type ControlRow = { parts: ControlPart[]; label: string }

/* Textos vêm do dict i18n (t.howto.*); aqui ficam só os ícones por posição. */
const OBJECTIVE_ICONS = [DrawCoin, DrawStar, DrawShield]

const WANTED_BULLET_ICONS: LucideIcon[][] = [
  [Car, Gauge, Ban],
  [Car, Crosshair, Zap],
  [Car, TrafficCone, Gauge],
  [Car, TrafficCone, Crosshair],
  [Siren, TrafficCone, Flame],
]

const MECHANIC_ICONS: LucideIcon[] = [Coins, Flame, HeartPulse, Hand]

/** Fragmento de descrição com "nó" no meio (R$ destacado ou MiniKey). */
function DescWithNode({ item }: { item: { a: string; k: 'money' | 'keyE' | 'keySpace' | null; b: string } }) {
  const { t } = useLang()
  return (
    <>
      {item.a}
      {item.k === 'money' && (
        <>
          {' '}
          <span className="font-bold text-cash-green">R$</span>
        </>
      )}
      {item.k === 'keyE' && (
        <>
          {' '}
          <MiniKey>E</MiniKey>
        </>
      )}
      {item.k === 'keySpace' && (
        <>
          {' '}
          <MiniKey>{t.howto.controls.space}</MiniKey>
        </>
      )}
      {item.b}
    </>
  )
}

/* ------------------------------------------------- card de controles (S2) */

function ControlCard({
  title,
  icon: Icon,
  accent,
  rows,
}: {
  title: string
  icon: LucideIcon
  accent: 'teal' | 'pink'
  rows: ControlRow[]
}) {
  return (
    <div
      data-ctrl-card
      className="rounded-[20px] border border-[rgba(201,184,232,0.14)] bg-night-800 p-6 md:p-10"
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border',
            accent === 'teal'
              ? 'border-teal-neon/30 bg-[rgba(0,229,199,0.08)] text-teal-neon'
              : 'border-vice-pink/30 bg-[rgba(255,46,136,0.08)] text-vice-pink',
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="text-2xl font-bold text-text-hi">{title}</h3>
      </div>
      <ul className="mt-8 divide-y divide-violet-haze">
        {rows.map((row, ri) => {
          let capPos = 0
          return (
            <li
              key={row.label}
              className="group -mx-3 flex items-center justify-between gap-4 rounded-lg px-3 py-3.5 transition-colors duration-200 hover:bg-[rgba(0,229,199,0.05)]"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {row.parts.map((part, pi) => (
                  <span key={pi} className="flex items-center gap-1.5">
                    {pi > 0 && <span className="px-1 text-sm text-text-dim">{part.join}</span>}
                    {part.caps.map((cap) => {
                      const kd = ri * 0.08 + capPos * 0.04
                      capPos += 1
                      return (
                        <span
                          key={cap}
                          data-keycap
                          data-kd={kd.toFixed(2)}
                          className="inline-flex will-change-transform"
                        >
                          <KeyCap
                            wide={cap.length > 1}
                            className="transition-colors group-hover:border-teal-neon"
                          >
                            {cap}
                          </KeyCap>
                        </span>
                      )
                    })}
                  </span>
                ))}
              </div>
              <span className="shrink-0 text-right text-text-hi">{row.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ------------------------------------------------- card de mecânica (S5) */

function MechCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon
  title: string
  desc: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-ny * 6).toFixed(2)}deg) rotateY(${(nx * 6).toFixed(2)}deg) translateY(-4px)`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      data-mech-card
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="card-vice group p-7 will-change-transform"
    >
      <div className="text-text-mid transition-all duration-300 group-hover:-rotate-6 group-hover:text-vice-pink group-hover:drop-shadow-[0_0_12px_rgba(255,46,136,0.6)]">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-2xl font-bold text-text-hi">{title}</h3>
      <p className="mt-3 leading-relaxed text-text-mid">{desc}</p>
    </div>
  )
}

/* ============================================================== COMO JOGAR */

export default function ComoJogar() {
  const { t } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)

  /* linhas de controles (S2): teclas fixas, labels/junções do dict */
  const FOOT_ROWS: ControlRow[] = [
    {
      parts: [{ caps: ['W', 'A', 'S', 'D'] }, { join: t.howto.controls.or, caps: ['↑', '←', '↓', '→'] }],
      label: t.howto.controls.footRows[0],
    },
    { parts: [{ caps: ['SHIFT'] }], label: t.howto.controls.footRows[1] },
    { parts: [{ caps: ['E'] }], label: t.howto.controls.footRows[2] },
  ]
  const DRIVE_ROWS: ControlRow[] = [
    { parts: [{ caps: ['W'] }, { join: '/', caps: ['↑'] }], label: t.howto.controls.driveRows[0] },
    { parts: [{ caps: ['S'] }, { join: '/', caps: ['↓'] }], label: t.howto.controls.driveRows[1] },
    { parts: [{ caps: ['A', 'D'] }, { join: '/', caps: ['←', '→'] }], label: t.howto.controls.driveRows[2] },
    { parts: [{ caps: [t.howto.controls.space] }], label: t.howto.controls.driveRows[3] },
    { parts: [{ caps: ['E'] }], label: t.howto.controls.driveRows[4] },
  ]

  // S1 — hero
  const frameRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)

  // S2 / S3 / S4 / S6 / S7 / S8
  const ctrlSecRef = useRef<HTMLElement>(null)
  const ctrlGridRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const objSecRef = useRef<HTMLElement>(null)
  const wantedSecRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const mechSecRef = useRef<HTMLElement>(null)
  const tipsSecRef = useRef<HTMLElement>(null)
  const faqSecRef = useRef<HTMLElement>(null)
  const ctaSecRef = useRef<HTMLElement>(null)
  const ctaPanelRef = useRef<HTMLDivElement>(null)

  // S4 — guia interativo do procurado
  const [wantedLevel, setWantedLevel] = useState(0)
  const [wantedReady, setWantedReady] = useState(false)
  const reduceMotion = useReducedMotion()

  // S4 — auto-ciclo 1→5 ao entrar na viewport (uma vez por sessão, flag da home)
  useEffect(() => {
    const sec = wantedSecRef.current
    if (!sec) return
    const timers: number[] = []
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io.disconnect()
        try {
          if (sessionStorage.getItem(CYCLE_KEY)) {
            setWantedLevel(3)
            setWantedReady(true)
            return
          }
        } catch {
          /* sessionStorage indisponível: segue com o ciclo */
        }
        for (let n = 1; n <= 5; n++) {
          timers.push(window.setTimeout(() => setWantedLevel(n), (n - 1) * 700))
        }
        timers.push(
          window.setTimeout(
            () => {
              setWantedLevel(3)
              setWantedReady(true)
              try {
                sessionStorage.setItem(CYCLE_KEY, '1')
              } catch {
                /* noop */
              }
            },
            5 * 700 + 600,
          ),
        )
      },
      { threshold: 0.4 },
    )
    io.observe(sec)
    return () => {
      io.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  /* ------------------------------------------------- animações GSAP */
  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* ---- S1: timeline de load do hero */
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.fromTo(
          '[data-hero-tag]',
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5 },
        )
          .fromTo(
            '[data-h1-char]',
            { y: 40, rotateX: -60, autoAlpha: 0 },
            { y: 0, rotateX: 0, autoAlpha: 1, duration: 0.7, stagger: 0.03, ease: 'back.out(1.4)' },
            '-=0.2',
          )
          .fromTo(
            '[data-lead-word]',
            { y: 20, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.025 },
            '-=0.35',
          )
          .fromTo(
            '[data-hero-cta]',
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.12 },
            '-=0.25',
          )
          .fromTo(
            frameRef.current,
            { x: 60, rotate: 6, autoAlpha: 0 },
            { x: 0, rotate: 2, autoAlpha: 1, duration: 0.9 },
            0.45,
          )
          .fromTo(
            chipRef.current,
            { scale: 0, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'back.out(2)' },
            0.65,
          )

        /* ---- helper: header de seção (tag + título + lead) */
        const head = (attr: string, trigger: Element | null) =>
          gsap.from(`[${attr}]`, {
            y: 32,
            autoAlpha: 0,
            duration: 0.6,
            stagger: 0.1,
            scrollTrigger: { trigger, start: 'top 80%', once: true },
          })

        /* ---- S2: controles */
        head('data-ctrl-head', ctrlSecRef.current)
        gsap.from('[data-ctrl-card]', {
          y: 48,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.15,
          scrollTrigger: { trigger: ctrlGridRef.current, start: 'top 80%', once: true },
        })
        gsap.from('[data-keycap]', {
          scale: 0,
          duration: 0.4,
          ease: 'back.out(2.5)',
          delay: 0.2,
          stagger: (i, el) => Number((el as HTMLElement).dataset.kd ?? i * 0.04),
          scrollTrigger: { trigger: ctrlGridRef.current, start: 'top 80%', once: true },
        })
        gsap.from(barRef.current, {
          y: 24,
          autoAlpha: 0,
          duration: 0.6,
          delay: 0.5,
          scrollTrigger: { trigger: ctrlGridRef.current, start: 'top 80%', once: true },
        })

        /* ---- S3: objetivo */
        head('data-obj-head', objSecRef.current)
        gsap.from('[data-obj-col]', {
          y: 32,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.12,
          scrollTrigger: { trigger: objSecRef.current, start: 'top 80%', once: true },
        })
        gsap.set('[data-draw]', { strokeDashoffset: 1 })
        gsap.to('[data-draw]', {
          strokeDashoffset: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: { trigger: objSecRef.current, start: 'top 80%', once: true },
        })

        /* ---- S4: guia do procurado */
        head('data-wanted-head', wantedSecRef.current)
        gsap.from(panelRef.current, {
          y: 40,
          autoAlpha: 0,
          duration: 0.7,
          scrollTrigger: { trigger: panelRef.current, start: 'top 80%', once: true },
        })

        /* ---- S5: mecânicas */
        head('data-mech-head', mechSecRef.current)
        const mechCards = gsap.utils.toArray<HTMLElement>('[data-mech-card]')
        gsap.set(mechCards, { y: 48, autoAlpha: 0 })
        ScrollTrigger.batch(mechCards, {
          start: 'top 80%',
          once: true,
          onEnter: (els) =>
            gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.09, ease: 'power3.out' }),
        })

        /* ---- S6: dicas de fuga */
        head('data-tips-head', tipsSecRef.current)
        gsap.from('[data-tip]', {
          x: -32,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.1,
          scrollTrigger: { trigger: tipsSecRef.current, start: 'top 80%', once: true },
        })
        gsap.from('[data-tip-num]', {
          autoAlpha: 0,
          letterSpacing: '0.15em',
          duration: 0.6,
          stagger: 0.1,
          scrollTrigger: { trigger: tipsSecRef.current, start: 'top 80%', once: true },
        })

        /* ---- S7: FAQ */
        head('data-faq-head', faqSecRef.current)
        gsap.from('[data-faq-item]', {
          y: 24,
          autoAlpha: 0,
          duration: 0.5,
          stagger: 0.08,
          scrollTrigger: { trigger: faqSecRef.current, start: 'top 80%', once: true },
        })

        /* ---- S8: CTA final */
        gsap.from(ctaPanelRef.current, {
          scale: 0.96,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: ctaSecRef.current, start: 'top 80%', once: true },
        })
      })
    },
    { scope: rootRef },
  )

  /* ------------------------------------------------- interações */

  // hero: tilt 3D sutil (máx 4°) preservando a rotação base de 2°
  const onFrameMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = frameRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(1000px) rotateX(${(-ny * 4).toFixed(2)}deg) rotateY(${(nx * 4).toFixed(2)}deg) rotate(2deg)`
  }
  const onFrameLeave = () => {
    if (frameRef.current) frameRef.current.style.transform = ''
  }

  // ghost "Ir direto aos controles": âncora #controles com smooth scroll (Lenis)
  const scrollToControls = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const el = document.getElementById('controles')
    if (!el) return
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(el, { offset: -16, duration: 1.4 })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const wanted = wantedLevel > 0 ? t.howto.wanted.levels[wantedLevel - 1] : null
  const wantedIcons = wantedLevel > 0 ? WANTED_BULLET_ICONS[wantedLevel - 1] : null

  return (
    <div ref={rootRef}>
      {/* ============================== S1 — HERO ============================== */}
      <section className="relative overflow-hidden" aria-label={t.howto.heroAria}>
        <div
          className="grad-police-red animate-police-pulse absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full"
          aria-hidden="true"
        />
        <div
          className="grad-police-blue animate-police-pulse absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full [animation-delay:600ms]"
          aria-hidden="true"
        />
        <div className="container-site relative grid items-center gap-14 pb-[72px] pt-14 md:pb-24 md:pt-[96px] lg:grid-cols-[3fr_2fr]">
          {/* esquerda: título + lead + CTAs */}
          <div>
            <div data-hero-tag>
              <SectionTag>{t.howto.tag}</SectionTag>
            </div>
            <h1
              aria-label={t.howto.h1}
              className="grad-text-vice mt-6 font-display text-[clamp(56px,9vw,120px)] uppercase leading-[0.95] tracking-[0.01em]"
            >
              <span aria-hidden="true">
                <SplitChars text={t.howto.h1} attr="data-h1-char" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-mid md:text-xl">
              <SplitWords text={t.howto.lead} attr="data-lead-word" />
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link to="/jogar" data-hero-cta className="btn-primary btn-shine">
                {t.howto.playNow}
              </Link>
              <a href="#controles" data-hero-cta onClick={scrollToControls} className="btn-ghost">
                {t.howto.toControls}
              </a>
            </div>
          </div>

          {/* direita: gameplay emoldurada */}
          <div
            ref={frameRef}
            onMouseMove={onFrameMove}
            onMouseLeave={onFrameLeave}
            className="relative rotate-2 rounded-2xl border border-violet-haze shadow-[0_0_40px_rgba(255,46,136,0.25),0_16px_48px_rgba(0,0,0,0.5)] transition-shadow duration-500 will-change-transform hover:shadow-[0_0_70px_rgba(255,46,136,0.45),0_16px_48px_rgba(0,0,0,0.5)]"
          >
            <img
              src="./gameplay-mock.svg"
              alt={t.howto.imgAlt}
              loading="eager"
              className="aspect-video w-full rounded-2xl object-cover"
            />
            <div ref={chipRef} className="chip-pixel absolute left-4 top-4">
              {t.howto.chip}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== S2 — CONTROLES ============================== */}
      <section id="controles" ref={ctrlSecRef} className="py-[72px] md:py-32">
        <div className="container-site">
          <div className="max-w-3xl">
            <div data-ctrl-head>
              <SectionTag>{t.howto.controls.tag}</SectionTag>
            </div>
            <h2
              data-ctrl-head
              className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi"
            >
              {t.howto.controls.title}
            </h2>
            <p data-ctrl-head className="mt-5 text-lg text-text-mid md:text-xl">
              {t.howto.controls.lead}
            </p>
          </div>

          <div ref={ctrlGridRef} className="mt-14 grid gap-6 lg:grid-cols-2">
            <ControlCard title={t.howto.controls.onFoot} icon={PersonStanding} accent="teal" rows={FOOT_ROWS} />
            <ControlCard title={t.howto.controls.driving} icon={Car} accent="pink" rows={DRIVE_ROWS} />
          </div>

          {/* barra "sempre vale" */}
          <div
            ref={barRef}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-[24px] border border-[rgba(201,184,232,0.14)] bg-night-700 px-8 py-5 md:rounded-full"
          >
            <span className="flex items-center gap-2.5">
              <span data-keycap data-kd="0.40" className="inline-flex will-change-transform">
                <KeyCap wide>ESC</KeyCap>
              </span>
              <span className="text-sm font-medium text-text-hi">{t.howto.controls.pause}</span>
            </span>
            <span className="flex items-center gap-2.5">
              <span data-keycap data-kd="0.45" className="inline-flex will-change-transform">
                <KeyCap>M</KeyCap>
              </span>
              <span className="text-sm font-medium text-text-hi">{t.howto.controls.mute}</span>
            </span>
            <span className="flex items-center gap-2.5">
              <Mouse className="h-6 w-6 text-teal-neon" aria-hidden="true" />
              <span className="text-sm font-medium text-text-hi">
                {t.howto.controls.mouseNote}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ============================== S3 — OBJETIVO ============================== */}
      <section ref={objSecRef} className="border-y border-violet-haze bg-night-900">
        <div className="container-site py-16">
          <div className="max-w-3xl">
            <div data-obj-head>
              <SectionTag>{t.howto.objective.tag}</SectionTag>
            </div>
            <h2
              data-obj-head
              className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi"
            >
              {t.howto.objective.title}
            </h2>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {t.howto.objective.items.map((o, i) => (
              <div key={o.title} data-obj-col>
                <div className="text-teal-neon drop-shadow-[0_0_12px_rgba(0,229,199,0.4)]">
                  {(() => {
                    const Icon = OBJECTIVE_ICONS[i]
                    return <Icon />
                  })()}
                </div>
                <h3 className="mt-5 text-2xl font-bold text-text-hi">{o.title}</h3>
                <p className="mt-3 leading-relaxed text-text-mid">
                  <DescWithNode item={o} />
                </p>
              </div>
            ))}
          </div>
          <p className="mt-14 text-center text-sm font-medium tracking-[0.02em] text-text-dim">
            {t.howto.objective.footnote}
          </p>
        </div>
      </section>

      {/* ============================== S4 — GUIA DO PROCURADO ============================== */}
      <section id="procurado" ref={wantedSecRef} className="py-[72px] md:py-32">
        <div className="container-site">
          <div className="max-w-3xl">
            <div data-wanted-head>
              <SectionTag>{t.howto.wanted.tag}</SectionTag>
            </div>
            <h2
              data-wanted-head
              className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi"
            >
              {t.howto.wanted.title}
            </h2>
            <p data-wanted-head className="mt-5 text-lg text-text-mid md:text-xl">
              {t.howto.wanted.lead}
            </p>
          </div>

          {/* painel mestre */}
          <div
            ref={panelRef}
            className="mt-12 rounded-[20px] border border-[rgba(201,184,232,0.14)] bg-night-800 p-6 transition-shadow duration-500 md:p-12"
            style={{
              boxShadow: `0 0 ${wantedLevel * 14}px rgba(255,214,10,${Math.min(0.35, wantedLevel * 0.07)})`,
            }}
          >
            <WantedStars
              level={wantedLevel}
              size={40}
              interactive={wantedReady}
              onLevelChange={setWantedLevel}
            />

            {/* barra de intensidade */}
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-violet-haze">
              <div
                className="grad-vice h-full rounded-full"
                style={{ width: `${wantedLevel * 20}%`, transition: 'width 400ms ease-out' }}
              />
            </div>
            <p className="mt-3 font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim">
              {t.howto.wanted.intensity}
            </p>

            {/* corpo: descrição do nível (crossfade) */}
            <div className="mt-8 min-h-[290px] sm:min-h-[250px] md:min-h-[220px]" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={wantedLevel}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  {wanted && wantedIcons ? (
                    <>
                      <h3 className="text-2xl font-bold text-text-hi">
                        <span className="text-star-gold">★{wantedLevel}</span> {wanted.label}
                      </h3>
                      <p className="mt-2 text-lg text-text-mid md:text-xl">{wanted.desc}</p>
                      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5">
                        {wanted.bullets.map((text, bi) => {
                          const BulletIcon = wantedIcons[bi]
                          return (
                            <li key={text} className="flex items-center gap-2 text-sm text-text-mid">
                              <BulletIcon className="h-4 w-4 shrink-0 text-teal-neon" aria-hidden="true" />
                              {text}
                            </li>
                          )
                        })}
                      </ul>
                      <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal-neon/30 bg-[rgba(0,229,199,0.06)] px-4 py-3">
                        <span className="shrink-0 pt-0.5 font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon">
                          {t.howto.wanted.tipLabel}
                        </span>
                        <p className="text-sm text-text-hi">{wanted.dica}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-text-hi">{t.howto.wanted.warmupTitle}</h3>
                      <p className="mt-2 text-lg text-text-mid md:text-xl">
                        {t.howto.wanted.warmupDesc}
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* evasão */}
            <div className="mt-10 rounded-r-xl border-l-[3px] border-teal-neon bg-night-700/40 p-6">
              <h3 className="text-2xl font-bold text-text-hi">{t.howto.wanted.evasionTitle}</h3>
              <p className="mt-3 leading-relaxed text-text-mid">{t.howto.wanted.evasionDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== S5 — MECÂNICAS ============================== */}
      <section ref={mechSecRef} className="py-[72px] md:py-32">
        <div className="container-site">
          <div className="max-w-3xl">
            <div data-mech-head>
              <SectionTag>{t.howto.mechanics.tag}</SectionTag>
            </div>
            <h2
              data-mech-head
              className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi"
            >
              {t.howto.mechanics.title}
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {t.howto.mechanics.items.map((m, i) => (
              <MechCard
                key={m.title}
                icon={MECHANIC_ICONS[i]}
                title={m.title}
                desc={<DescWithNode item={m} />}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================== S6 — DICAS DE FUGA ============================== */}
      <section ref={tipsSecRef} className="py-[72px] md:py-32">
        <div className="mx-auto w-full max-w-[900px] px-6">
          <div>
            <div data-tips-head>
              <SectionTag>{t.howto.tips.tag}</SectionTag>
            </div>
            <h2
              data-tips-head
              className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi"
            >
              {t.howto.tips.title}
            </h2>
          </div>
          <ol className="mt-12 divide-y divide-violet-haze">
            {t.howto.tips.items.map((tip) => (
              <li key={tip.num} data-tip className="step flex items-start gap-6 py-6 first:pt-0">
                <span
                  data-tip-num
                  className="step-num w-16 shrink-0 font-display text-[48px] leading-none"
                >
                  {tip.num}
                </span>
                <p className="pt-1 text-lg leading-relaxed md:text-xl">
                  <strong className="font-bold text-text-hi">{tip.bold}</strong>
                  <span className="text-text-mid">{tip.rest}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================== S7 — FAQ ============================== */}
      <section ref={faqSecRef} className="py-[72px] md:py-32">
        <div className="mx-auto w-full max-w-[800px] px-6">
          <div>
            <div data-faq-head>
              <SectionTag>{t.howto.faq.tag}</SectionTag>
            </div>
            <h2
              data-faq-head
              className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi"
            >
              {t.howto.faq.title}
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-10 space-y-3">
            {t.howto.faq.items.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                data-faq-item
                className="rounded-xl border border-violet-haze px-5 transition-colors duration-300 last:border-b data-[state=open]:bg-night-800"
              >
                <AccordionTrigger className="py-5 text-base font-bold text-text-hi hover:no-underline md:text-lg [&>svg]:size-5 [&>svg]:text-teal-neon">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-text-mid opacity-0 transition-opacity delay-100 duration-150 [[data-state=open]>&]:opacity-100">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============================== S8 — CTA FINAL ============================== */}
      <section ref={ctaSecRef} className="py-[72px] md:py-32">
        <div className="container-site">
          <div
            ref={ctaPanelRef}
            className="grad-vice rounded-[24px] px-6 py-16 text-center text-night-950 md:p-[72px]"
          >
            <h2 className="font-display text-[clamp(30px,5vw,48px)] uppercase leading-[1.05] tracking-[0.02em]">
              {t.howto.cta.title}
            </h2>
            <p className="mt-4 text-lg font-medium">{t.howto.cta.sub}</p>
            <div className="mt-10">
              <CtaPulse>
                <Link
                  to="/jogar"
                  className="btn-shine inline-flex items-center justify-center rounded-full bg-night-950 px-11 py-[18px] text-lg font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-95"
                >
                  <span className="grad-text-vice">{t.howto.cta.cta}</span>
                </Link>
              </CtaPulse>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
