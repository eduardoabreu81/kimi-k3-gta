import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import SectionTag from '@/components/SectionTag'
import WantedStars, { STAR_PATH } from '@/components/WantedStars'
import KeyCap from '@/components/KeyCap'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/* ---------------------------------------------------------------- helpers */

function SplitChars({ text, attr }: { text: string; attr: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={i} {...{ [attr]: true }} className="inline-block will-change-transform">
          {ch === ' ' ? ' ' : ch}
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
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

/** Sol synthwave: círculo grad-sun com 5 listras recortadas na metade inferior */
function SynthSun() {
  return (
    <svg width="340" height="340" viewBox="0 0 340 340" aria-hidden="true" className="h-auto w-full">
      <defs>
        <radialGradient id="heroSunGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="45%" stopColor="#FF7A29" />
          <stop offset="100%" stopColor="#FF2E88" />
        </radialGradient>
        <mask id="heroSunStripes">
          <rect width="340" height="340" fill="white" />
          <rect x="0" y="176" width="340" height="4" fill="black" />
          <rect x="0" y="188" width="340" height="6" fill="black" />
          <rect x="0" y="203" width="340" height="9" fill="black" />
          <rect x="0" y="222" width="340" height="12" fill="black" />
          <rect x="0" y="245" width="340" height="15" fill="black" />
        </mask>
      </defs>
      <circle cx="170" cy="170" r="166" fill="url(#heroSunGrad)" mask="url(#heroSunStripes)" />
    </svg>
  )
}

/** Palmeira fina decorativa que flanqueia o "VI" do logo (sunset-gold) */
function PalmGlyph({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      fill="currentColor"
    >
      <path d="M29 62 C30 48 27 38 29 27 C30 21 34 21 35 27 C37 38 35 48 36 62 Z" />
      <path d="M32 25 C22 16 12 14 4 19 C12 20 22 24 28 30 Z" />
      <path d="M32 23 C26 12 17 7 7 9 C16 11 24 17 29 26 Z" />
      <path d="M32 22 C31 12 33 4 38 1 C36 10 36 17 35 24 Z" />
      <path d="M34 23 C40 12 49 8 58 10 C49 12 41 18 36 26 Z" />
      <path d="M35 26 C45 19 55 19 61 24 C52 24 43 27 37 31 Z" />
      <circle cx="28" cy="27" r="3" />
      <circle cx="37" cy="28" r="3" />
    </svg>
  )
}

/* --------------------------------------------------------- ícones S3 (32px) */

type IconProps = { className?: string }
const iconCls = 'h-8 w-8'

function MapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={cn(iconCls, className)} aria-hidden="true">
      <path d="M12 6 L4 9 V26 L12 23 L20 26 L28 23 V6 L20 9 Z" />
      <path d="M12 6 V23 M20 9 V26" />
    </svg>
  )
}
function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className={cn(iconCls, className)} aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  )
}
function KeyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={cn(iconCls, className)} aria-hidden="true">
      <circle cx="11" cy="16" r="5" />
      <path d="M16 16 H28 M23 16 V21 M28 16 V19" />
    </svg>
  )
}
function TrafficIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(iconCls, className)} aria-hidden="true">
      <rect x="12" y="3" width="8" height="26" rx="3.5" />
      <circle cx="16" cy="9.5" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="22.5" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  )
}
function PeopleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={cn(iconCls, className)} aria-hidden="true">
      <circle cx="12" cy="10" r="4" />
      <path d="M4 27 C4 20.5 7.5 17 12 17 C16.5 17 20 20.5 20 27" />
      <circle cx="23.5" cy="12" r="3" />
      <path d="M21 27 C21 22.5 23.5 20 26.5 20.5" />
    </svg>
  )
}
function RadarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={cn(iconCls, className)} aria-hidden="true">
      <circle cx="16" cy="16" r="12" />
      <circle cx="16" cy="16" r="7" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
      <path d="M16 16 L24.5 7.5" />
      <circle cx="21.5" cy="19.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ------------------------------------------------------------------ dados */
/* Textos vêm do dict i18n (t.home.*); aqui ficam só ícones/estilos/valores. */

const FEATURE_ICONS = [MapIcon, StarIcon, KeyIcon, TrafficIcon, PeopleIcon, RadarIcon]

const CALLOUT_STYLES = [
  { left: '50%', top: '13%' },
  { left: '14%', top: '62%' },
  { left: '63%', top: '44%' },
  { left: '37%', top: '79%' },
]

const CYCLE_KEY = 'gta6mini.wantedCycled'

const STAT_VALUES = [
  { value: 0, suffix: '', infinity: false },
  { value: 100, suffix: '%', infinity: false },
  { value: 5, suffix: '', infinity: false },
  { value: 0, suffix: '', infinity: true },
]

/* ------------------------------------------------- card com tilt 3D (S3) */

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: (p: IconProps) => React.JSX.Element
  title: string
  desc: string
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
      data-feature-card
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="card-vice group p-7 will-change-transform"
    >
      <div className="text-text-mid transition-all duration-300 group-hover:-rotate-6 group-hover:text-vice-pink group-hover:drop-shadow-[0_0_12px_rgba(255,46,136,0.6)]">
        <Icon />
      </div>
      <h3 className="mt-5 text-2xl font-bold text-text-hi">{title}</h3>
      <p className="mt-3 leading-relaxed text-text-mid">{desc}</p>
    </div>
  )
}

/* ==================================================================== HOME */

export default function Home() {
  const { t } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)

  // S1 — hero
  const heroSecRef = useRef<HTMLElement>(null)
  const skyRef = useRef<HTMLDivElement>(null)
  const sunRef = useRef<HTMLDivElement>(null)
  const skylineRef = useRef<HTMLImageElement>(null)
  const palmsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)
  const microRef = useRef<HTMLParagraphElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)

  // S2 — marquee
  const marqueeRef = useRef<HTMLDivElement>(null)

  // S3 — features
  const featHeadRef = useRef<HTMLDivElement>(null)
  const featLeadRef = useRef<HTMLParagraphElement>(null)

  // S4 — showcase pinado
  const showSecRef = useRef<HTMLElement>(null)
  const showHeadRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const mockImgRef = useRef<HTMLImageElement>(null)

  // S5 — procurado
  const wantedSecRef = useRef<HTMLElement>(null)
  const [wantedLevel, setWantedLevel] = useState(0)
  const [wantedReady, setWantedReady] = useState(false)

  // S6 / S7 / S8
  const stepsRef = useRef<HTMLElement>(null)
  const connectorRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLElement>(null)
  const finalSecRef = useRef<HTMLElement>(null)
  const finalBtnRef = useRef<HTMLDivElement>(null)

  // estrelas do céu do hero (layout estável)
  const skyStars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 33,
        size: 1 + Math.random(),
        opacity: 0.25 + Math.random() * 0.65,
        duration: 1.5 + Math.random() * 1.5,
        delay: Math.random() * 3,
      })),
    [],
  )

  // S5 — auto-ciclo 1→5 ao entrar na viewport (uma vez por sessão)
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
          window.setTimeout(() => {
            setWantedLevel(3)
            setWantedReady(true)
            try {
              sessionStorage.setItem(CYCLE_KEY, '1')
            } catch {
              /* noop */
            }
          }, 5 * 700 + 600),
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
        const cleanups: Array<() => void> = []
        /* ---- S1: timeline de load do hero (~2.2s) */
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.fromTo(skyRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 })
          .fromTo(
            sunRef.current,
            { scale: 0.8, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
            '-=0.1',
          )
          .fromTo(
            skylineRef.current,
            { y: 80, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.9 },
            '-=0.55',
          )
          .fromTo(
            '.hero-palm',
            { y: 120, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 },
            '-=0.7',
          )
          .fromTo(
            '[data-logo-char]',
            { y: 60, rotateX: -90, autoAlpha: 0 },
            { y: 0, rotateX: 0, autoAlpha: 1, duration: 0.8, stagger: 0.04, ease: 'back.out(1.7)' },
            0.7,
          )
          .fromTo(chipRef.current, { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, '-=0.55')
          .fromTo(
            '[data-tag-word]',
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.03 },
            '-=0.3',
          )
          .fromTo(subRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.25')
          .fromTo(
            '[data-cta]',
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.12 },
            '-=0.25',
          )
          .fromTo(
            [microRef.current, cueRef.current],
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.5 },
            '-=0.15',
          )

        /* ---- S1: saída com parallax — conteúdo sobe mais rápido que o scroll */
        gsap.to(contentRef.current, {
          yPercent: -28,
          ease: 'none',
          scrollTrigger: { trigger: heroSecRef.current, start: 'top top', end: 'bottom top', scrub: true },
        })

        /* ---- S1: parallax de mouse (lerp via quickTo) */
        const hero = heroSecRef.current
        if (hero && window.matchMedia('(pointer: fine)').matches) {
          const sunX = gsap.quickTo(sunRef.current, 'x', { duration: 0.6, ease: 'power2.out' })
          const sunY = gsap.quickTo(sunRef.current, 'y', { duration: 0.6, ease: 'power2.out' })
          const palmX = gsap.quickTo(palmsRef.current, 'x', { duration: 0.6, ease: 'power2.out' })
          const palmY = gsap.quickTo(palmsRef.current, 'y', { duration: 0.6, ease: 'power2.out' })
          const skyX = gsap.quickTo(skylineRef.current, 'x', { duration: 0.6, ease: 'power2.out' })
          const skyY = gsap.quickTo(skylineRef.current, 'y', { duration: 0.6, ease: 'power2.out' })
          const onMove = (e: MouseEvent) => {
            const r = hero.getBoundingClientRect()
            const nx = ((e.clientX - r.left) / r.width - 0.5) * 2
            const ny = ((e.clientY - r.top) / r.height - 0.5) * 2
            sunX(nx * 8); sunY(ny * 8)
            palmX(nx * 14); palmY(ny * 14)
            skyX(nx * 5); skyY(ny * 5)
            gsap.to(logoRef.current, {
              rotateY: nx * 3,
              rotateX: -ny * 3,
              transformPerspective: 900,
              duration: 0.6,
              ease: 'power2.out',
            })
          }
          hero.addEventListener('mousemove', onMove)
          cleanups.push(() => hero.removeEventListener('mousemove', onMove))
        }

        /* ---- S2: marquee entra com scaleX 0→1 */
        gsap.from(marqueeRef.current, {
          scaleX: 0,
          transformOrigin: 'center',
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: { trigger: marqueeRef.current, start: 'top 90%', once: true },
        })

        /* ---- S3: header + cards (batch) */
        gsap.from('[data-feat-word]', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.04,
          scrollTrigger: { trigger: featHeadRef.current, start: 'top 80%', once: true },
        })
        gsap.from(featLeadRef.current, {
          autoAlpha: 0,
          y: 16,
          duration: 0.6,
          delay: 0.25,
          scrollTrigger: { trigger: featHeadRef.current, start: 'top 80%', once: true },
        })
        const cards = gsap.utils.toArray<HTMLElement>('[data-feature-card]')
        gsap.set(cards, { y: 48, autoAlpha: 0 })
        ScrollTrigger.batch(cards, {
          start: 'top 85%',
          once: true,
          onEnter: (els) =>
            gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.09, ease: 'power3.out' }),
        })

        /* ---- S5: header */
        gsap.from('[data-wanted-reveal]', {
          y: 36,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.12,
          scrollTrigger: { trigger: wantedSecRef.current, start: 'top 75%', once: true },
        })

        /* ---- S6: números, textos e conector */
        gsap.from('[data-step-num]', {
          autoAlpha: 0,
          letterSpacing: '0.2em',
          duration: 0.7,
          stagger: 0.15,
          scrollTrigger: { trigger: stepsRef.current, start: 'top 75%', once: true },
        })
        gsap.from('[data-step-text]', {
          y: 32,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.15,
          scrollTrigger: { trigger: stepsRef.current, start: 'top 75%', once: true },
        })
        gsap.from(connectorRef.current, {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 0.8,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 75%', once: true },
        })

        /* ---- S7: count-up dos stats */
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
              const target = Number(el.dataset.count ?? '0')
              const suffix = el.dataset.suffix ?? ''
              const obj = { v: 0 }
              el.textContent = '0' + suffix
              gsap.to(obj, {
                v: target,
                duration: 1.2,
                ease: 'power2.out',
                snap: { v: 1 },
                onUpdate: () => {
                  el.textContent = String(Math.round(obj.v)) + suffix
                },
              })
            })
            gsap.from('[data-stat-label]', { autoAlpha: 0, duration: 0.4, delay: 0.2, stagger: 0.08 })
            const inf = statsRef.current?.querySelector('[data-infinity]')
            if (inf) gsap.from(inf, { scale: 0, duration: 0.7, ease: 'back.out(2)' })
          },
        })

        /* ---- S8: H1 char-level + botão */
        gsap.from('[data-final-char]', {
          y: 40,
          rotateX: -60,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.035,
          ease: 'back.out(1.4)',
          scrollTrigger: { trigger: finalSecRef.current, start: 'top 75%', once: true },
        })
        gsap.from(finalBtnRef.current, {
          scale: 0.8,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'back.out(1.7)',
          scrollTrigger: { trigger: finalSecRef.current, start: 'top 70%', once: true },
        })

        return () => cleanups.forEach((fn) => fn())
      })

      /* ---- S4: showcase pinado (150vh) — desktop + movimento permitido */
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const callouts = gsap.utils.toArray<HTMLElement>('[data-callout]')
        const st = gsap.timeline({
          scrollTrigger: {
            trigger: showSecRef.current,
            start: 'top top',
            end: '+=150%',
            scrub: true,
            pin: true,
            anticipatePin: 1,
          },
        })
        // 0 → 0.3: moldura scale .9→1, radius 32→20, zoom-out da imagem
        st.fromTo(
          frameRef.current,
          { scale: 0.9, borderRadius: 32 },
          { scale: 1, borderRadius: 20, duration: 0.3, ease: 'none' },
          0,
        ).fromTo(mockImgRef.current, { scale: 1.15 }, { scale: 1, duration: 0.3, ease: 'none' }, 0)
        // 0.3 → 0.9: callouts em sequência (+0.12 de progresso cada)
        callouts.forEach((el, i) => {
          const at = 0.3 + i * 0.12
          const line = el.querySelector('.callout-line')
          if (line) st.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.05, ease: 'none' }, at)
          st.fromTo(el, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.07, ease: 'none' }, at + 0.02)
        })
        // 0.9 → 1: H2 sobe e fixa acima da moldura
        st.to(showHeadRef.current, { y: -24, duration: 0.1, ease: 'none' }, 0.9)
      })
    },
    { scope: rootRef },
  )

  const wanted = wantedLevel > 0 ? t.home.wanted.levels[wantedLevel - 1] : null

  return (
    <div ref={rootRef}>
      {/* ============================== S1 — HERO ============================== */}
      <section
        ref={heroSecRef}
        className="relative flex min-h-[max(720px,100dvh)] flex-col overflow-hidden"
        aria-label={t.home.heroAria}
      >
        {/* 1. céu */}
        <div ref={skyRef} className="grad-sunset-sky absolute inset-0" aria-hidden="true" />
        {/* 2. estrelas */}
        <div className="absolute inset-0" aria-hidden="true">
          {skyStars.map((s) => (
            <span
              key={s.id}
              className="animate-twinkle absolute rounded-full bg-text-hi"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
        {/* 3. sol synthwave */}
        <div
          ref={sunRef}
          className="absolute left-1/2 top-[58%] w-[min(340px,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_120px_rgba(255,122,41,0.45)]"
          aria-hidden="true"
        >
          <SynthSun />
        </div>
        {/* 4. skyline */}
        <img
          ref={skylineRef}
          src="./hero-skyline.svg"
          alt=""
          loading="eager"
          className="absolute bottom-0 left-0 w-full object-cover object-bottom"
        />
        {/* 5. palmeiras */}
        <div ref={palmsRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
          <img
            src="./palm-silhouette.svg"
            alt=""
            loading="eager"
            className="hero-palm absolute -bottom-4 left-[-40px] w-[300px] opacity-90 md:left-[2%] md:w-[420px]"
          />
          <img
            src="./palm-silhouette.svg"
            alt=""
            loading="eager"
            className="hero-palm absolute -bottom-4 right-[-60px] w-[340px] -scale-x-100 md:right-[1%] md:w-[520px]"
          />
          <img
            src="./palm-silhouette.svg"
            alt=""
            loading="eager"
            className="hero-palm absolute -bottom-2 left-[30%] hidden w-[220px] opacity-70 lg:block"
          />
        </div>
        {/* 6. reflexos policiais */}
        <div
          className="grad-police-red animate-police-pulse absolute -bottom-16 -left-16 h-[420px] w-[420px] rounded-full opacity-0"
          style={{ animationDelay: '2.4s' }}
          aria-hidden="true"
        />
        <div
          className="grad-police-blue animate-police-pulse absolute -bottom-16 -right-16 h-[420px] w-[420px] rounded-full opacity-0"
          style={{ animationDelay: '3s' }}
          aria-hidden="true"
        />
        {/* 7. conteúdo central */}
        <div
          ref={contentRef}
          className="container-site relative z-10 flex flex-1 flex-col items-center justify-center pb-28 pt-24 text-center"
        >
          <div ref={chipRef} className="chip-pixel mb-8">
            {t.home.chip}
          </div>
          <div ref={logoRef} className="[transform-style:preserve-3d]">
            <div className="text-glow-pink font-display text-[clamp(72px,14vw,180px)] uppercase leading-[0.9] tracking-[0.01em] text-text-hi">
              <SplitChars text="GTA" attr="data-logo-char" />
            </div>
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <PalmGlyph flip className="h-[clamp(34px,6vw,84px)] w-auto shrink-0 text-sunset-gold" />
              <div className="grad-text-vice font-display text-[clamp(90px,17.5vw,225px)] uppercase leading-[0.9] tracking-[0.01em] drop-shadow-[0_0_35px_rgba(255,46,136,0.55)]">
                <SplitChars text="VI" attr="data-logo-char" />
              </div>
              <PalmGlyph className="h-[clamp(34px,6vw,84px)] w-auto shrink-0 text-sunset-gold" />
            </div>
            <div className="text-stroke-hi font-display text-[clamp(56px,9vw,120px)] uppercase leading-[0.9] tracking-[0.3em]">
              <SplitChars text="MINI" attr="data-logo-char" />
            </div>
          </div>
          <h1 className="mt-8 max-w-xl text-2xl font-medium text-text-hi md:text-[28px]">
            <SplitWords text={t.home.tagline} attr="data-tag-word" />
          </h1>
          <p ref={subRef} className="mt-4 max-w-[560px] text-lg leading-relaxed text-text-mid md:text-xl">
            {t.home.sub}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/jogar" data-cta className="btn-primary btn-cta btn-shine rounded-full px-10 py-[18px] text-lg">
              {t.home.playNow}
            </Link>
            <Link to="/como-jogar" data-cta className="btn-secondary px-8 py-4">
              {t.home.howTo}
            </Link>
          </div>
          <p ref={microRef} className="mt-8 font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim">
            {t.home.micro}
          </p>
        </div>
        {/* 8. scroll cue */}
        <div ref={cueRef} className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <div className="animate-cue-bounce flex flex-col items-center gap-2">
            <KeyCap className="h-8 w-8 text-xs">↓</KeyCap>
            <span className="font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim">{t.home.scroll}</span>
          </div>
        </div>
      </section>

      {/* ============================== S2 — MARQUEE ============================== */}
      <section aria-hidden="true" className="relative z-20 overflow-hidden py-8">
        <div ref={marqueeRef} className="grad-vice -ml-[2vw] w-[104vw] -rotate-[1.2deg]">
          <div className="group flex h-14 items-center overflow-hidden">
            <div className="animate-marquee flex w-max items-center group-hover:[animation-play-state:paused]">
              {[0, 1].map((half) => (
                <div key={half} className="flex items-center">
                  {[...t.home.marquee, ...t.home.marquee].map((txt, i) => (
                    <span key={i} className="flex items-center">
                      <span className="whitespace-nowrap px-6 font-display text-2xl uppercase tracking-[0.02em] text-night-950">
                        {txt}
                      </span>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d={STAR_PATH} fill="#FFD60A" />
                      </svg>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== S3 — FEATURES ============================== */}
      <section id="o-jogo" className="py-24 md:py-32">
        <div className="container-site">
          <div ref={featHeadRef} className="max-w-3xl">
            <SectionTag>{t.home.features.tag}</SectionTag>
            <h2 className="mt-5 font-display text-[clamp(40px,6vw,72px)] uppercase leading-[0.95] tracking-[0.01em] text-text-hi">
              <SplitWords text={t.home.features.title} attr="data-feat-word" />
            </h2>
            <p ref={featLeadRef} className="mt-5 text-lg text-text-mid md:text-xl">
              {t.home.features.lead}
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.home.features.items.map((f, i) => (
              <FeatureCard key={f.title} icon={FEATURE_ICONS[i]} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================== S4 — SHOWCASE PINADO ============================== */}
      <section
        ref={showSecRef}
        className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden py-20"
        aria-label={t.home.showcase.aria}
      >
        <div className="container-site">
          <div ref={showHeadRef} className="mb-10 text-center">
            <SectionTag className="justify-center">{t.home.showcase.tag}</SectionTag>
            <h2 className="mt-5 font-display text-[clamp(30px,4vw,48px)] uppercase leading-[0.95] tracking-[0.02em] text-text-hi">
              {t.home.showcase.title}
            </h2>
          </div>

          {/* moldura de monitor arcade */}
          <div
            ref={frameRef}
            className="group relative mx-auto max-w-[1000px] overflow-hidden rounded-[20px] border border-violet-haze shadow-[0_0_60px_rgba(255,46,136,0.22),0_16px_48px_rgba(0,0,0,0.5)] transition-shadow duration-500 hover:shadow-[0_0_90px_rgba(255,46,136,0.4),0_16px_48px_rgba(0,0,0,0.5)]"
          >
            <img
              ref={mockImgRef}
              src="./gameplay-mock.svg"
              alt={t.home.showcase.imgAlt}
              loading="lazy"
              className="aspect-video w-full object-cover will-change-transform"
            />
            <div className="scanlines pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

            {/* callouts (overlay desktop) */}
            {t.home.showcase.callouts.map((label, i) => (
              <div
                key={label}
                data-callout
                className="absolute hidden -translate-x-1/2 flex-col items-center md:flex"
                style={CALLOUT_STYLES[i]}
              >
                <span className="whitespace-nowrap rounded-full border border-teal-neon bg-[rgba(13,6,24,0.9)] px-3 py-1.5 font-pixel text-[10px] uppercase tracking-[0.08em] text-teal-neon">
                  {label}
                </span>
                <span className="callout-line mt-1 h-6 w-px origin-top border-l border-dashed border-teal-neon" aria-hidden="true" />
              </div>
            ))}
          </div>

          {/* fallback mobile: callouts empilhados abaixo */}
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-3 md:hidden">
            {t.home.showcase.callouts.map((label) => (
              <li key={label} className="chip-pixel">
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================== S5 — NÍVEL DE PROCURADO ============================== */}
      <section id="procurado" ref={wantedSecRef} className="py-24 md:py-32">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <div>
            <div data-wanted-reveal>
              <SectionTag>{t.home.wanted.tag}</SectionTag>
            </div>
            <h2
              data-wanted-reveal
              className="mt-5 font-display text-[clamp(40px,6vw,72px)] uppercase leading-[0.95] tracking-[0.01em] text-text-hi"
            >
              {t.home.wanted.title}
            </h2>
            <p data-wanted-reveal className="mt-5 max-w-xl text-lg leading-relaxed text-text-mid md:text-xl">
              {t.home.wanted.lead}
            </p>
          </div>

          {/* painel interativo */}
          <div
            data-wanted-reveal
            className="rounded-[20px] border border-[rgba(201,184,232,0.14)] bg-night-800 p-8 transition-shadow duration-500 md:p-10"
            style={{
              boxShadow: `0 0 ${wantedLevel * 14}px rgba(255,214,10,${Math.min(0.35, wantedLevel * 0.07)})`,
            }}
          >
            <WantedStars
              level={wantedLevel}
              size={40}
              interactive={wantedReady}
              onLevelChange={setWantedLevel}
              aria-live="polite"
            />
            <div key={wantedLevel} className="desc-swap mt-6 min-h-[92px]">
              {wanted ? (
                <>
                  <p className="text-2xl font-bold text-text-hi">
                    <span className="text-star-gold">★{wantedLevel}</span> {wanted.label}
                  </p>
                  <p className="mt-2 text-lg text-text-mid">{wanted.desc}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-text-hi">{t.home.wanted.warmupTitle}</p>
                  <p className="mt-2 text-lg text-text-mid">{t.home.wanted.warmupDesc}</p>
                </>
              )}
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-violet-haze">
              <div
                className="grad-vice h-full rounded-full"
                style={{ width: `${wantedLevel * 20}%`, transition: 'width 400ms ease-out' }}
              />
            </div>
            <p className="mt-3 font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim">
              {t.home.wanted.intensity}
            </p>
          </div>
        </div>
      </section>

      {/* ============================== S6 — COMO FUNCIONA ============================== */}
      <section ref={stepsRef} className="py-24 md:py-32">
        <div className="container-site">
          <div className="text-center">
            <SectionTag className="justify-center">{t.home.steps.tag}</SectionTag>
            <h2 className="mt-5 font-display text-[clamp(40px,6vw,72px)] uppercase leading-[0.95] tracking-[0.01em] text-text-hi">
              {t.home.steps.title}
            </h2>
          </div>
          <div className="relative mt-16 grid gap-14 md:grid-cols-3 md:gap-8">
            <div
              ref={connectorRef}
              aria-hidden="true"
              className="absolute left-[18%] right-[18%] top-12 hidden border-t-2 border-dashed border-teal-neon/40 md:block"
            />
            {t.home.steps.items.map((s) => (
              <div key={s.num} className="step relative text-center md:text-left">
                <div data-step-num className="step-num font-display text-[96px] leading-none">
                  {s.num}
                </div>
                <div data-step-text>
                  <h3 className="mt-4 text-2xl font-bold text-text-hi">{s.title}</h3>
                  <p className="mt-3 leading-relaxed text-text-mid">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== S7 — STATS ============================== */}
      <section ref={statsRef} className="border-y border-violet-haze bg-night-900 py-16">
        <div className="container-site grid grid-cols-2 gap-10 lg:grid-cols-4">
          {STAT_VALUES.map((s, i) => (
            <div key={t.home.stats[i]} className="text-center">
              {s.infinity ? (
                <div data-infinity className="grad-text-vice font-display text-[64px] leading-none">
                  ∞
                </div>
              ) : (
                <div
                  data-count={s.value}
                  data-suffix={s.suffix}
                  className="grad-text-vice font-display text-[64px] leading-none"
                >
                  {s.value}
                  {s.suffix}
                </div>
              )}
              <p data-stat-label className="mt-3 font-pixel text-[10px] uppercase tracking-[0.08em] text-text-dim">
                {t.home.stats[i]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================== S8 — CTA FINAL ============================== */}
      <section
        ref={finalSecRef}
        className="relative flex min-h-[90dvh] flex-col items-center justify-center overflow-hidden text-center"
      >
        <div className="grad-sunset-sky absolute inset-0" aria-hidden="true" />
        <img
          src="./hero-skyline.svg"
          alt=""
          loading="lazy"
          className="absolute bottom-0 left-0 w-full object-cover object-bottom opacity-70"
        />
        <div
          className="grad-police-red animate-police-pulse absolute -bottom-16 -left-16 h-[420px] w-[420px] rounded-full"
          aria-hidden="true"
        />
        <div
          className="grad-police-blue animate-police-pulse absolute -bottom-16 -right-16 h-[420px] w-[420px] rounded-full [animation-delay:600ms]"
          aria-hidden="true"
        />
        <div className="container-site relative z-10 py-24">
          <h2 className="grad-text-vice font-display text-[clamp(56px,9vw,120px)] uppercase leading-[0.95] tracking-[0.01em]">
            <SplitChars text={t.home.final.titleA} attr="data-final-char" />
            <br />
            <SplitChars text={t.home.final.titleB} attr="data-final-char" />
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-text-mid md:text-xl">
            {t.home.final.sub}
          </p>
          <div ref={finalBtnRef} className="mt-10 flex flex-col items-center gap-6">
            <Link to="/jogar" className="btn-primary btn-cta btn-shine rounded-full px-12 py-5 text-xl">
              {t.home.final.cta}
            </Link>
            <Link to="/como-jogar" className="btn-ghost">
              {t.home.final.learn}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
