import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import './timing.css'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setDeckTheme,
  laterStageActive,
} from './hand3d/handBus.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const mix = (a, b, t) => {
  const out = {}
  for (const k of Object.keys(a)) out[k] = lerp(a[k], b[k], t)
  return out
}

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

const CHAIN = ['Perfect information', 'the choice is still A5', 'worth $0 to the decision']

const CARDS = [
  {
    id: 'study',
    rank: 'S',
    glyph: '○',
    title: 'Study first',
    small: 'two years',
    back: '≈$0.05B study cost · ≈$0.10B value forgone → nets −$0.15B. And the answer doesn’t change.',
  },
  {
    id: 'act',
    rank: 'A',
    glyph: '●',
    title: 'Act now',
    small: 'the model’s answer',
    back: 'The Balanced package, today. No possible finding could flip the choice.',
  },
]

/*
 * 11 · Act now or study first? — pinned hand stage.
 * The question and "EVPI = ?" appear over two empty dashed slots; the hand
 * comes off its right-edge park and places both option cards, UNSELECTED.
 * The "?" resolves to $0.00B, holds, and only then does "Act now" earn its
 * ✓ — information that can't change the decision is worth nothing.
 */
export default function TimingSection() {
  const stageRef = useRef(null)
  const slotRefs = useRef([])
  const [flipped, setFlipped] = useState([false, false])
  const [selected, setSelected] = useState(false)
  const selRef = useRef(false)

  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const tp = clamp01(-stage.top / (stage.height - vh))
      raw.set(tp)

      // content state before the hand guards — the selection beat must track
      // the scroll even when a later stage owns the hand
      const sel = tp >= 0.78 // BUFFER 2 = [0.66–0.78] (explain EVPI)
      if (selRef.current !== sel) {
        selRef.current = sel
        setSelected(sel)
      }

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(11)) return

      const slA = slotRefs.current[0]?.getBoundingClientRect()
      const slB = slotRefs.current[1]?.getBoundingClientRect()
      if (!slA || !slB) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      const PARK_RIGHT = {
        x: vw - 70,
        y: vh * 0.52,
        scale: desktop ? 0.55 : 0.45,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }
      const placeAt = (r) => ({
        x: Math.min(r.right + 55, vw - 70),
        y: r.bottom - 35,
        scale: desktop ? 0.62 : 0.45,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      })
      const PLACE_A = placeAt(slA)
      const PLACE_B = placeAt(slB)
      const BELOW = {
        x: vw * 0.5,
        y: vh * 1.6,
        scale: desktop ? 0.75 : 0.55,
        rotZ: -0.05,
        rotX: -0.1,
        rotY: Math.PI + 0.2,
      }

      setCardMode(1)
      setPose('grip')
      // back of the card currently riding in the hand: grey ○ then black ●
      setDeckTheme(tp < 0.27 ? { color: '#9aa0a6', glyph: '○' } : { color: '#111111', glyph: '●' })

      if (tp <= 0.1) {
        // section 10 leaves the hand parked at the right edge — hold it there
        setHandTarget(PARK_RIGHT, 0.12)
        setCard(1) // holding 10's haul — it recolors to the grey ○ en route
      } else if (tp <= 0.2) {
        // travel to slot A, drawing the grey ○ card on the way over
        const t = ease((tp - 0.1) / 0.1)
        setHandTarget(mix(PARK_RIGHT, PLACE_A, t), 0.12)
        setCard(1)
      } else if (tp <= 0.27) {
        // place "Study first": the 3D card melts into the DOM card fading in
        setHandTarget(PLACE_A, 0.12)
        setCard(1 - clamp01((tp - 0.2) / 0.07))
      } else if (tp <= 0.35) {
        // slide to slot B while a fresh black ● card fades back in
        const t = ease((tp - 0.27) / 0.08)
        setHandTarget(mix(PLACE_A, PLACE_B, t), 0.12)
        setCard(ease(clamp01((tp - 0.27) / 0.08)))
      } else if (tp <= 0.42) {
        // place "Act now" — still UNSELECTED: the two cards sit equal weight
        setHandTarget(PLACE_B, 0.12)
        setCard(1 - clamp01((tp - 0.35) / 0.07))
      } else if (tp <= 0.5) {
        // the hand withdraws below the table and stays out
        const t = ease((tp - 0.42) / 0.08)
        setHandTarget(mix(PLACE_B, BELOW, t), 0.12)
        setCard(0)
      } else {
        setHandTarget(BELOW, 0.12)
        setCard(0)
      }
    }
    director()
    window.addEventListener('scroll', director, { passive: true })
    window.addEventListener('resize', director)
    return () => {
      window.removeEventListener('scroll', director)
      window.removeEventListener('resize', director)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* whiteboard rule: every appearance is a fade in place (opacity only;
     the cards may breathe 0.94 → 1) — and the whole board fades out in place */
  const exitOp = useTransform(p, (v) => 1 - clamp01((v - 0.92) / 0.08))

  /* [0.02–0.08] header AND the "EVPI = ?" hero arrive together */
  const headerOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.06))

  /* the DOM cards appear exactly while the hand's 3D card melts */
  const card0Op = useTransform(p, (v) => clamp01((v - 0.2) / 0.07))
  const card1Op = useTransform(p, (v) => clamp01((v - 0.35) / 0.07))
  const card0Scale = useTransform(card0Op, (v) => 0.94 + v * 0.06)
  const card1Scale = useTransform(card1Op, (v) => 0.94 + v * 0.06)
  const card0Ev = useTransform(p, (v) =>
    clamp01((v - 0.2) / 0.07) > 0.6 && v < 0.92 ? 'auto' : 'none',
  )
  const card1Ev = useTransform(p, (v) =>
    clamp01((v - 0.35) / 0.07) > 0.6 && v < 0.92 ? 'auto' : 'none',
  )
  const cardStyles = [
    { opacity: card0Op, scale: card0Scale, pointerEvents: card0Ev },
    { opacity: card1Op, scale: card1Scale, pointerEvents: card1Ev },
  ]

  /* the empty dashed slots show with the header, then yield to their cards */
  const slot0Op = useTransform(p, (v) => clamp01((v - 0.02) / 0.06) * (1 - clamp01((v - 0.2) / 0.07)))
  const slot1Op = useTransform(p, (v) => clamp01((v - 0.02) / 0.06) * (1 - clamp01((v - 0.35) / 0.07)))
  const slotOps = [slot0Op, slot1Op]

  /* BUFFER 1 = [0.50–0.60] (explain the two choices). Then [0.60–0.66]:
     the "?" crossfades to $0.00B; the logic pills land in the same window */
  const qOp = useTransform(p, (v) => 1 - clamp01((v - 0.6) / 0.06))
  const valOp = useTransform(p, (v) => clamp01((v - 0.6) / 0.06))
  const pill0Op = useTransform(p, (v) => clamp01((v - 0.6) / 0.04))
  const pill1Op = useTransform(p, (v) => clamp01((v - 0.61) / 0.04))
  const pill2Op = useTransform(p, (v) => clamp01((v - 0.62) / 0.04))
  const pillOps = [pill0Op, pill1Op, pill2Op]

  /* [0.68–0.72] the punchline lands WITH the selection of "Act now" */
  const punchOp = useTransform(p, (v) => clamp01((v - 0.78) / 0.04)) // lands WITH the selection; BUFFER 3 = [0.82–0.92]

  const onFlip = (i) => setFlipped((f) => f.map((v, k) => (k === i ? !v : v)))

  return (
    <section className="tim-stage hand-stage" data-order="11" id="timing" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="tim-wrap" style={{ opacity: exitOp }}>
          <motion.div className="team-header tim-header" style={{ opacity: headerOp }}>
            <div className="subtitle">
              <span className="subtitle-dot" />
              <span>11 · Act now or study first?</span>
            </div>
            <h2 className="team-heading tim-heading">
              Should we
              <br />
              wait?
            </h2>
            <p className="dq-lead tim-lead">
              Congress has a second decision upstream of the policy: act now, or commission a
              two-year national prevalence study and decide after seeing the result.
            </p>
          </motion.div>

          <div className="tim-body">
            <div className="tim-options">
              {CARDS.map((c, i) => (
                <div
                  className="tim-slot"
                  key={c.id}
                  ref={(el) => {
                    slotRefs.current[i] = el
                  }}
                >
                  <motion.div className="tim-slot-outline" style={{ opacity: slotOps[i] }} />
                  <motion.div className="tim-drop" style={cardStyles[i]}>
                    <div
                      className={`tim-card${c.id === 'act' && selected ? ' tim-selected' : ''}${
                        flipped[i] ? ' tim-flipped' : ''
                      }`}
                      onClick={() => onFlip(i)}
                    >
                      <div className="tim-card-inner">
                        <div className="tim-face tim-front">
                          <span className="tim-rank">
                            <b>{c.rank}</b>
                            <i>{c.glyph}</i>
                          </span>
                          {c.id === 'act' && <span className="tim-check">✓</span>}
                          <span className="tim-glyph">{c.glyph}</span>
                          <h3 className="tim-title">{c.title}</h3>
                          <span className="tim-small">{c.small}</span>
                          <span className="tim-rank tim-rank-flip">
                            <b>{c.rank}</b>
                            <i>{c.glyph}</i>
                          </span>
                        </div>
                        <div className="tim-face tim-back">
                          <span className="tim-back-name">
                            {c.glyph} {c.title}
                          </span>
                          <p className="tim-back-copy">{c.back}</p>
                          <span className="tim-back-hint">click to flip back</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>

            <motion.p className="tim-flip-cue" style={{ opacity: card1Op }}>
              Click a card to flip it.
            </motion.p>

            <motion.div className="tim-hero" style={{ opacity: headerOp }}>
              <span className="tim-hero-stat">
                <span>EVPI&nbsp;=&nbsp;</span>
                <span className="tim-swap">
                  <motion.span style={{ opacity: qOp }}>?</motion.span>
                  <motion.span style={{ opacity: valOp }}>$0.00B</motion.span>
                </span>
              </span>
              <span className="tim-hero-sub">expected value of perfect information</span>
            </motion.div>

            <div className="tim-chain">
              {CHAIN.map((step, i) => (
                <motion.span className="tim-chain-item" key={step} style={{ opacity: pillOps[i] }}>
                  {i > 0 && <span className="tim-chain-arrow">→</span>}
                  <span className="tim-pill">{step}</span>
                </motion.span>
              ))}
            </div>

            <motion.p className="tim-punchline" style={{ opacity: punchOp }}>
              Information only has value when it can change a decision. This one can&rsquo;t be
              changed. <b>Act now.</b>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
