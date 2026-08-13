import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import './prohibition.css'
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

const STEPS = [
  { t: 'Federal ban' },
  { t: 'Demand remains' },
  { t: '≈$84B illegal market', s: 'already this big alongside legal options' },
  { t: 'Monitoring disappears', s: 'only monitored money can be defended' },
  { t: 'More fixing, more harm' },
]

/* fade windows [start, width] — card 1 is placed by the hand, 2–5 cascade */
const CARD_WINS = [
  [0.24, 0.08],
  [0.48, 0.075],
  [0.555, 0.075],
  [0.63, 0.075],
  [0.705, 0.075],
]

/*
 * 10 · The counterintuitive one — the hand enters from the LEFT edge,
 * places the first chain card ("Federal ban"), parks at the right, and
 * the rest of the causal chain cascades in one card at a time.
 */
export default function ProhibitionSection() {
  const stageRef = useRef(null)
  const chainRef = useRef(null)
  const card1Ref = useRef(null)

  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })

  // the whiteboard rule: everything fades in in place, everything fades
  // out in place — the wrapper handles the exit
  const wrapOp = useTransform(p, (v) => 1 - clamp01((v - 0.95) / 0.05))
  const headOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.06))
  const supportOp = useTransform(p, (v) => clamp01((v - 0.32) / 0.14))
  const quoteOp = useTransform(p, (v) => clamp01((v - 0.78) / 0.07))
  /* eslint-disable react-hooks/rules-of-hooks -- CARD_WINS is a module constant, hook order is stable */
  const cardOps = CARD_WINS.map(([a, w]) => useTransform(p, (v) => clamp01((v - a) / w)))
  const cardScales = CARD_WINS.map(([a, w]) =>
    useTransform(p, (v) => 0.94 + 0.06 * clamp01((v - a) / w)),
  )
  /* eslint-enable react-hooks/rules-of-hooks */

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const pp = clamp01(-stage.top / (stage.height - vh))
      raw.set(pp)

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(10)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      const chain = chainRef.current?.getBoundingClientRect()
      const slot1 = card1Ref.current?.getBoundingClientRect()
      if (!chain || !slot1) return

      // 09 leaves the hand parked below the frame
      const BELOW = desktop
        ? { x: vw * 0.5, y: vh * 1.6, scale: 0.75, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
        : { x: vw * 0.5, y: vh * 1.6, scale: 0.55, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      const placeScale = desktop ? 0.62 : 0.45
      // just off the LEFT edge, at chain-row height
      const LEFT_OFF = {
        x: -160,
        y: chain.bottom - 35,
        scale: placeScale,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }
      const PLACE1 = {
        x: Math.min(slot1.right + 55, vw - 70),
        y: slot1.bottom - 35,
        scale: placeScale,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }
      const PARK_RIGHT = {
        x: vw - 70,
        y: vh * 0.52,
        scale: desktop ? 0.55 : 0.45,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }

      setDeckTheme({ color: '#3E8E8C', glyph: '⬟' })
      setCardMode(1)
      setPose('grip')

      let target
      if (pp <= 0.06) {
        target = BELOW // only the heading is fading in up top
        setCard(0)
      } else if (pp <= 0.11) {
        // slip from below the frame to just off the left edge
        target = mix(BELOW, LEFT_OFF, ease((pp - 0.06) / 0.05))
        setCard(0)
      } else if (pp <= 0.24) {
        // enter from the LEFT — the A6 deck fades in over the first half
        target = mix(LEFT_OFF, PLACE1, ease((pp - 0.11) / 0.13))
        setCard(clamp01((pp - 0.11) / 0.065))
      } else if (pp <= 0.32) {
        // place card 1: the 3D card melts into the DOM card
        target = PLACE1
        setCard(1 - clamp01((pp - 0.24) / 0.08))
      } else if (pp <= 0.46) {
        // withdraw to the right edge while the supporting text fades in
        target = mix(PLACE1, PARK_RIGHT, ease((pp - 0.32) / 0.14))
        setCard(0)
      } else {
        target = PARK_RIGHT // idle while the chain cascades
        setCard(0)
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

  return (
    <section className="proh-stage hand-stage" data-order="10" id="prohibition" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="proh-wrap" style={{ opacity: wrapOp }}>
          <div className="proh-top">
            <div className="dq-head">
              <motion.div style={{ opacity: headOp }}>
                <div className="subtitle">
                  <span className="subtitle-dot" />
                  <span>10 · The counterintuitive one</span>
                </div>
                <h2 className="team-heading">
                  Why didn&rsquo;t
                  <br />
                  prohibition win?
                </h2>
              </motion.div>
              <motion.p className="dq-lead" style={{ opacity: supportOp }}>
                The harshest policy is the worst one in the model — by a factor of two. Here is
                the causal chain.
              </motion.p>
            </div>
            <motion.div className="proh-stat" style={{ opacity: supportOp }}>
              <span className="proh-stat-num">
                <i className="proh-stat-glyph">⬟</i>
                −$18.61B
              </span>
              <span className="proh-stat-sub">per year · A6 Full prohibition</span>
            </motion.div>
          </div>

          <div className="proh-chain" ref={chainRef}>
            {STEPS.map((step, i) => (
              <div className="proh-link" key={step.t}>
                {i > 0 && (
                  <motion.span
                    className="proh-arrow"
                    aria-hidden="true"
                    style={{ opacity: cardOps[i] }}
                  >
                    <span className="proh-arrow-h">→</span>
                    <span className="proh-arrow-v">↓</span>
                  </motion.span>
                )}
                <motion.div
                  className="proh-card"
                  ref={i === 0 ? card1Ref : undefined}
                  style={{ opacity: cardOps[i], scale: cardScales[i] }}
                >
                  <span className="proh-card-rank">{i + 1}</span>
                  <span className="proh-card-title">{step.t}</span>
                  {step.s && <span className="proh-card-sub">{step.s}</span>}
                  <span className="proh-card-glyph">⬟</span>
                </motion.div>
              </div>
            ))}
          </div>

          <div className="proh-bottom">
            <motion.blockquote className="proh-quote" style={{ opacity: quoteOp }}>
              Prohibition takes the market away from regulators — without taking the market
              away.
            </motion.blockquote>
            <motion.p className="proh-footnote" style={{ opacity: quoteOp }}>
              0 wins in 1,500 futures — eliminated by stochastic dominance; even its best draw
              finishes $3.98B behind the status quo.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
