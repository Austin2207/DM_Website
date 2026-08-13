import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react'
import { Plus, X } from 'lucide-react'
import DealDrop from './DealDrop.jsx'
import {
  hand,
  moveHand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setDeckTheme,
  setPerforming,
  sleep,
  laterStageActive,
} from './hand3d/handBus.js'

const EASE = [0.16, 1, 0.3, 1]

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const mix = (a, b, t) => {
  const out = {}
  for (const k of Object.keys(a)) out[k] = lerp(a[k], b[k], t)
  return out
}

// nudge direction the hand gives each card before it takes over the screen
const NUDGE = [
  { x: 0, y: 56 },   // left card  -> pulled down into its own space
  { x: -64, y: 0 },  // middle     -> pushed left
  { x: 0, y: -56 },  // right card -> pulled up
]

const TEAM = [
  {
    id: 'harley',
    name: 'Harley Davis',
    initials: 'HD',
    color: '#B5484D',
    glyph: '▲',
    photo: '/team/harley.jpg',
    pos: '62% 30%',
    role: 'Framing',
    line: 'Rising high-school senior at Stanford Summer Session.',
    tags: ['Boston', 'Stanford Summer Session', 'Business analytics', 'Volleyball', 'Golf'],
    detail:
      'Harley led the framing of the federal decision — Sections 1–2 of the report. A rising high-school senior from Boston attending Stanford Summer Session, aiming at business analytics. Plays volleyball, basketball — and golf.',
  },
  {
    id: 'davis',
    name: 'Davis Dong',
    initials: 'DD',
    color: '#4A6FA5',
    glyph: '●',
    photo: '/team/davis.jpg',
    pos: '45% 42%',
    role: 'Alternatives & Information',
    line: 'Industrial & Systems Engineering sophomore at NUS.',
    tags: ['NUS', 'Industrial & Systems Eng.', 'Tennis', 'Golf'],
    detail:
      'Davis owned the alternative space and the uncertainty research — Sections 3–4: the real federal bills, the case studies, and the evidence pack behind the probabilities. Industrial & Systems Engineering sophomore at the National University of Singapore. Plays tennis — and golf.',
  },
  {
    id: 'austin',
    name: 'Austin Fan',
    initials: 'AF',
    color: '#4E7D58',
    glyph: '■',
    photo: '/team/austin.jpg',
    pos: '60% 40%',
    role: 'Model & Engine',
    line: '3rd-year CS at USYD, raised in Hong Kong.',
    tags: ['Hong Kong', 'USYD · CS Year 3', 'Built the engine', 'GeNIe', 'Golf'],
    detail:
      'Austin built the model itself: the segments-and-losses engine, the 1,500-draw Monte Carlo, and the GeNIe influence diagram — Sections 5–7. Raised in Hong Kong, 3rd-year Computer Science at the University of Sydney. Codes, builds — and golfs. Three golfers on this team.',
  },
]

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

export default function TeamSection() {
  const stageRef = useRef(null)
  const rowRef = useRef(null)
  const slotRefs = useRef([])
  const cardRefs = useRef([])
  const busy = useRef(false)
  const dealtRef = useRef([false, false, false])

  const [dealt, setDealt] = useState([false, false, false])
  const [expanded, setExpanded] = useState(null)
  const [offsets, setOffsets] = useState(TEAM.map(() => ({ x: 0, y: 0 })))
  const [cardBox, setCardBox] = useState(null)

  // spring-smoothed per-card deal progress (no React re-render per scroll)
  const raw0 = useMotionValue(0)
  const raw1 = useMotionValue(0)
  const raw2 = useMotionValue(0)
  const springCfg = { stiffness: 170, damping: 26 }
  const s0 = useSpring(raw0, springCfg)
  const s1 = useSpring(raw1, springCfg)
  const s2 = useSpring(raw2, springCfg)
  const raws = [raw0, raw1, raw2]
  const springs = [s0, s1, s2]
  const rawS0 = useMotionValue(0)
  const rawS1 = useMotionValue(0)
  const rawS2 = useMotionValue(0)
  const sw0 = useSpring(rawS0, springCfg)
  const sw1 = useSpring(rawS1, springCfg)
  const sw2 = useSpring(rawS2, springCfg)
  const rawsS = [rawS0, rawS1, rawS2]
  const sweeps = [sw0, sw1, sw2]
  const headerRaw = useMotionValue(0)
  const headerOp = useSpring(headerRaw, { stiffness: 150, damping: 28 })

  /*
   * THE TIMELINE — pure function of scrollY, with two PINNED stages:
   * the page holds still while scroll scrubs the hand.
   *
   *   hero (scrolls away)      hand alone, open palm, no card
   *   problem stage (pinned)   card materializes + copy fades in,
   *                            then the hand turns over and grips it face-down
   *   team stage (pinned)      hand carries the deck in, lays down the three
   *                            member cards one per third of the scrub, parks
   *   release                  page scrolls on to the next sections
   */
  useEffect(() => {
    const director = () => {
      if (hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      const iStage = document.querySelector('.intro-stage')?.getBoundingClientRect()
      const tStage = stageRef.current?.getBoundingClientRect()
      const row = rowRef.current?.getBoundingClientRect()
      const sl0 = slotRefs.current[0]?.getBoundingClientRect()
      const sl1 = slotRefs.current[1]?.getBoundingClientRect()
      const sl2 = slotRefs.current[2]?.getBoundingClientRect()
      if (!iStage || !tStage || !row || !sl0 || !sl1 || !sl2) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const desktop = isDesktop()
      const prog = (r) => clamp01(-r.top / (r.height - vh))
      const ip = prog(iStage)
      const tp = prog(tStage)
      // between the two pins: the team stage top travels vh -> 0
      const approach = tStage.top >= vh ? 0 : clamp01(1 - tStage.top / vh)

      /* per-card cycle: arrive -> BUFFER (30%) -> the card materializes WHILE
         the hand slides to the next spot. Austin's rhythm: the pause is on
         arrival, the deal and the travel share the same beat. */
      const dealStep = (u, N) => {
        const k = Math.min(N - 1, Math.max(0, Math.floor(u)))
        const frac = clamp01(u - k)
        const t = clamp01((frac - 0.3) / 0.7)
        const moveOut = k >= N - 1 ? 0 : t
        const handT = (k + moveOut) / (N - 1)
        return { handT, pis: Array.from({ length: N }, (_, i) => (i < k ? 1 : i === k ? t : 0)) }
      }
      // long hold after all three land [0.68, 0.84]; collect flows straight
      // out (settle squeezed to the last 3% — no pause with the green deck)
      const D0 = 0.2, D1 = 0.5, H1 = 0.86, C1 = 0.97
      const u = clamp01((tp - D0) / (D1 - D0)) * 3
      const step = dealStep(u, 3)
      const ct = clamp01((tp - H1) / (C1 - H1))
      // collect: gather the pile onto the moving hand (70%), then fling it off (30%)
      const flingT = clamp01((ct - 0.7) / 0.3)
      const handSweepT = ct <= 0.7 ? 1 - ct / 0.7 : -flingT * flingT * 1.8
      const handPxX = lerp(sl0.right, sl2.right, handSweepT) + 55
      const pis = tp >= D1 ? [1, 1, 1] : step.pis
      pis.forEach((p, i) => raws[i].set(p))
      const slotRects = [sl0, sl1, sl2]
      const sws = [0, 1, 2].map((i) => {
        if (ct <= 0) return 0
        if (handSweepT > i / 2 + 0.02) return 0 // the hand hasn't reached this card yet
        return Math.min(0, handPxX - (slotRects[i].right + 20) - i * 12)
      })
      sws.forEach((v, i) => rawsS[i].set(v))
      const flags = pis.map((p) => p >= 0.99 && tp < H1)
      if (flags.some((f, i) => f !== dealtRef.current[i])) {
        dealtRef.current = flags
        setDealt(flags)
      }
      // title appears only AFTER the deck is in the hand; gone during the collect
      headerRaw.set(Math.min(clamp01((tp - 0.03) / 0.05), 1 - clamp01((tp - H1) / 0.08)))

      // once a later stage reaches the viewport, its director drives the hand
      if (laterStageActive(2)) return

      // the hand never moves or resizes during the intro pin
      const HERO = desktop
        ? { x: vw * 0.5, y: vh * 0.58, scale: 1.5, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        : { x: vw * 0.5, y: vh * 0.52, scale: 0.8, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
      const HOLD = desktop
        ? { x: vw * 0.5, y: vh * 0.46, scale: 0.9, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
        : { x: vw * 0.5, y: vh * 0.42, scale: 0.62, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      const dealScale = desktop ? 0.62 : 0.45
      // the hand (with its deck) rides at the bottom-right of the card being dealt
      const dealPose = (t) => ({
        x: Math.min(lerp(sl0.right, sl2.right, t) + 55, vw - 70),
        y: lerp(sl0.bottom, sl2.bottom, t) - 35,
        scale: dealScale,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      })

      let target
      if (tp > 0) {
        const nextIdx = Math.min(2, pis.filter((p) => p >= 0.6).length)
        setDeckTheme({ color: TEAM[nextIdx].color, glyph: TEAM[nextIdx].glyph })
        if (tp <= 0.03) {
          // deck already faded in during the approach — just top it up
          target = HOLD
          setPose('grip')
          setCard(1)
        } else if (tp <= 0.08) {
          target = HOLD // ...then the title fades in
          setPose('grip')
          setCard(1)
        } else if (tp <= 0.14) {
          const t = ease((tp - 0.08) / 0.06) // vertical descent first
          target = mix(HOLD, { ...dealPose(0), x: HOLD.x }, t)
          setPose('grip')
          setCard(1)
        } else if (tp <= D0) {
          const t = ease((tp - 0.14) / 0.06) // ...then the horizontal slide
          target = mix({ ...dealPose(0), x: HOLD.x }, dealPose(0), t)
          setPose('grip')
          setCard(1)
        } else if (tp <= D1) {
          target = dealPose(step.handT) // dwell -> deal -> slide, card by card
          setPose('grip')
          setCard(1 - pis[2])
        } else if (tp <= H1) {
          target = dealPose(1) // buffer: table set, cards clickable
          setPose('open')
          setCard(0)
        } else if (tp <= C1) {
          // the pile rides the hand leftward, then gets flung off the table
          target = dealPose(handSweepT)
          setPose(ct > 0.7 ? 'open' : 'grip')
          setCard(0)
        } else {
          const t = ease((tp - C1) / (1 - C1)) // fresh deck, next table
          target = mix(dealPose(-0.6), HOLD, t)
          setPose('grip')
          setCard(t)
        }
        setCardMode(1)
      } else if (approach > 0) {
        // unpinned gap: the hand is upright and the DECK already fades in
        // here — the travel to the team table is part of the show, not a pause
        target = HOLD
        setPose('grip')
        setCardMode(1)
        setCard(ease(approach))
      } else {
        // intro pin: hand fixed; the card appears from thin air above it,
        // then vanishes again at the end of the stage
        target = HERO
        setPose('flat')
        setCardMode(0)
        setDeckTheme(null)
        const cin = ease(clamp01((ip - 0.22) / 0.2))
        // ONE long buffer at full display [0.42, 0.78] — nothing moves. The
        // exit (card shrinks + copy fades + hand rises) then runs continuously
        // to the pin release: zero pause after the hand lifts the card.
        const cout = 1 - ease(clamp01((ip - 0.78) / 0.16))
        setCard(Math.min(cin, cout))
        if (ip > 0.78) {
          const t = ease((ip - 0.78) / 0.22)
          target = mix(HERO, HOLD, t)
          setPose(t > 0.5 ? 'grip' : 'flat')
          setCardMode(0)
          setHandTarget(target, 0.12)
          return
        }
      }
      setHandTarget(target, 0.12)
    }
    director()
    window.addEventListener('scroll', director, { passive: true })
    window.addEventListener('resize', director)
    return () => {
      window.removeEventListener('scroll', director)
      window.removeEventListener('resize', director)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const targetBoxFor = (i) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (!isDesktop()) {
      const w = Math.min(300, vw - 48)
      return { left: (vw - w) / 2, top: 84, width: w, height: 190 }
    }
    const w = Math.min(400, vw * 0.28)
    const h = Math.min(520, vh * 0.62)
    const left = i === 2 ? vw * 0.86 - w : vw * 0.14
    return { left, top: (vh - h) / 2, width: w, height: h }
  }

  const openCard = async (i) => {
    const rect = cardRefs.current[i].getBoundingClientRect()
    if (isDesktop()) {
      setPerforming(true)
      await moveHand(
        { x: rect.left + rect.width / 2, y: rect.top + 118, scale: 0.62, rotZ: 0, rotX: -0.22, rotY: Math.PI },
        0.5,
        'open',
      )
      setPose('grip')
      setOffsets((o) => o.map((v, k) => (k === i ? NUDGE[i] : v)))
      await sleep(280)
    }
    setCardBox({ left: rect.left + NUDGE[i].x, top: rect.top + NUDGE[i].y, width: rect.width, height: rect.height })
    setExpanded(i)
    requestAnimationFrame(() => requestAnimationFrame(() => setCardBox(targetBoxFor(i))))
    setOffsets((o) => o.map(() => ({ x: 0, y: 0 })))
    if (isDesktop()) {
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPose('point')
      await moveHand(
        {
          x: i === 2 ? vw * 0.26 : vw * 0.8,
          y: vh * 0.98,
          rotZ: i === 2 ? 0.12 : -0.12,
          rotX: -0.1,
          rotY: Math.PI + (i === 2 ? 0.3 : -0.3),
        },
        0.8,
      )
    }
  }

  const closeCard = async () => {
    const i = expanded
    if (i === null) return
    const rect = cardRefs.current[i].getBoundingClientRect()
    const desktop = isDesktop()
    if (desktop) {
      // mirror of the opening: the hand comes to collect the big card first
      const b = targetBoxFor(i)
      setPose('open')
      await moveHand(
        { x: b.left + b.width / 2, y: b.top + 130, scale: 0.62, rotZ: 0, rotX: -0.22, rotY: Math.PI },
        0.55,
      )
      setPose('grip')
      await sleep(180)
    }
    // the card glides back to its (still nudged) place in the row, hand alongside
    setCardBox({ left: rect.left + NUDGE[i].x, top: rect.top + NUDGE[i].y, width: rect.width, height: rect.height })
    if (desktop) {
      await moveHand(
        {
          x: rect.left + NUDGE[i].x + rect.width / 2,
          y: rect.top + NUDGE[i].y + 118,
          scale: 0.62,
          rotZ: 0,
          rotX: -0.22,
          rotY: Math.PI,
        },
        0.6,
      )
    } else {
      await sleep(500)
    }
    // overlay dissolves onto the grid card at the same nudged spot…
    setOffsets((o) => o.map((v, k) => (k === i ? NUDGE[i] : v)))
    setExpanded(null)
    setCardBox(null)
    await sleep(60)
    // …then the hand pushes it back into the slot and lets go
    setOffsets((o) => o.map(() => ({ x: 0, y: 0 })))
    if (desktop) {
      await sleep(280)
      setPose('open')
      await sleep(120)
      setPerforming(false)
      window.dispatchEvent(new Event('scroll')) // hand re-syncs to the timeline
    }
  }

  const onCard = (i) => {
    if (!dealt[i] || busy.current || expanded !== null) return
    busy.current = true
    openCard(i).finally(() => {
      busy.current = false
    })
  }
  const onClose = () => {
    if (busy.current || expanded === null) return
    busy.current = true
    closeCard().finally(() => {
      busy.current = false
    })
  }

  const m = expanded !== null ? TEAM[expanded] : null

  return (
    <section className="team-stage hand-stage" data-order="2" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>02 · The team</span>
          </div>
          <h2 className="team-heading">The team.</h2>
          <p className="team-hint">Keep scrolling — the hand deals. Click a card — it gets its own page.</p>
        </motion.div>

        <div className="team-row" ref={rowRef}>
          {TEAM.map((mm, i) => (
            <div key={mm.id} className="member-slot" ref={(el) => (slotRefs.current[i] = el)}>
              <DealDrop p={springs[i]} sw={sweeps[i]}>
                <motion.div
                  ref={(el) => (cardRefs.current[i] = el)}
                  className="member-card"
                  onClick={() => onCard(i)}
                  animate={{ x: offsets[i].x, y: offsets[i].y }}
                  transition={{ duration: 0.3, ease: EASE }}
                  style={{ visibility: expanded === i ? 'hidden' : 'visible' }}
                  whileHover={expanded === null && dealt[i] ? { y: -6 } : {}}
                >
                  <img
                    className="member-photo"
                    src={mm.photo}
                    alt={mm.name}
                    style={{ objectPosition: mm.pos }}
                    draggable={false}
                  />
                  <div className="member-name">
                    {mm.name} <span className="member-glyph" style={{ color: mm.color }}>{mm.glyph}</span>
                  </div>
                  <div className="member-role">{mm.role}</div>
                  <div className="member-line">{mm.line}</div>
                  <div className="member-tags">
                    {mm.tags.map((tg) => (
                      <span key={tg} className="member-tag">{tg}</span>
                    ))}
                  </div>
                  <span className="member-plus">
                    <Plus size={12} strokeWidth={3} color="#fff" />
                  </span>
                </motion.div>
              </DealDrop>
            </div>
          ))}
        </div>

        {/* the blank space a pulled card lives in — nothing else survives.
            Portaled to <body>: the sticky pin creates a stacking context that
            would otherwise trap the overlay underneath the fixed navbar. */}
        {createPortal(
        <AnimatePresence>
          {m && (
            <motion.div
              className="takeover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onClick={onClose}
            >
              {cardBox && (
                <motion.div
                  className="takeover-card"
                  onClick={(e) => e.stopPropagation()}
                  initial={false}
                  animate={{ ...cardBox }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <img
                    className="member-photo takeover-photo"
                    src={m.photo}
                    alt={m.name}
                    style={{ objectPosition: m.pos }}
                    draggable={false}
                  />
                  <div className="member-name">
                    {m.name} <span className="member-glyph" style={{ color: m.color }}>{m.glyph}</span>
                  </div>
                  <div className="member-role">{m.role}</div>
                </motion.div>
              )}
              <motion.div
                className={'takeover-text ' + (expanded === 2 ? 'side-left' : 'side-right')}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, x: expanded === 2 ? -28 : 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4, duration: 0.55, ease: EASE }}
              >
                <div className="subtitle">
                  <span className="subtitle-dot" />
                  <span>{m.role}</span>
                </div>
                <h3>{m.name}</h3>
                <p>{m.detail}</p>
                <div className="member-tags">
                  {m.tags.map((tg) => (
                    <span key={tg} className="member-tag">{tg}</span>
                  ))}
                </div>
              </motion.div>
              <button className="takeover-close" onClick={onClose} aria-label="Close">
                <X size={16} strokeWidth={2.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
        )}
      </div>
    </section>
  )
}
