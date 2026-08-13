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
  [0.44, 0.075],
  [0.505, 0.075],
  [0.57, 0.075],
  [0.635, 0.075],
]

/*
 * 10 · The counterintuitive one — the hand starts parked at the LEFT edge
 * (09 leaves it there), places the first chain card ("Federal ban"),
 * returns to the left while the causal chain cascades in, then exits with
 * a LEFT→RIGHT collection sweep that gathers the chain into its deck and
 * ends parked at the right for section 11.
 */
export default function ProhibitionSection() {
  const stageRef = useRef(null)
  const chainRef = useRef(null)
  const card1Ref = useRef(null)
  const collectDirtyRef = useRef(false)

  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })

  // the whiteboard rule: everything fades in in place, everything fades
  // out in place — the wrapper fade overlaps the collection sweep's tail
  const wrapOp = useTransform(p, (v) => 1 - clamp01((v - 0.93) / 0.07))
  const headOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.06))
  const supportOp = useTransform(p, (v) => clamp01((v - 0.32) / 0.14))
  // the closing quote lands right after the chain — then a REAL completion
  // buffer holds the finished table before the collect starts at 0.91
  const quoteOp = useTransform(p, (v) => clamp01((v - 0.73) / 0.06))
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

      // reverse scroll out of the collect: clear the sweep's inline opacities
      // once so the chain row is pristine again
      if (pp < 0.86 && collectDirtyRef.current) {
        collectDirtyRef.current = false
        stageRef.current
          ?.querySelectorAll('.proh-chain .proh-card, .proh-chain .proh-arrow')
          .forEach((el) => {
            el.style.opacity = ''
            el.style.transition = ''
          })
      }

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(10)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      const chain = chainRef.current?.getBoundingClientRect()
      const slot1 = card1Ref.current?.getBoundingClientRect()
      if (!chain || !slot1) return

      const placeScale = desktop ? 0.62 : 0.45
      // 09 leaves the hand parked at the LEFT edge
      const PARK_LEFT = {
        x: desktop ? 70 : 50,
        y: vh * 0.52,
        scale: desktop ? 0.55 : 0.45,
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
        // approach: 09 finishes with the hand already parked at the left
        target = PARK_LEFT
        setCard(1) // holding 09's card — it recolors to the A6 teal en route
      } else if (pp <= 0.24) {
        // slide from the left park to card 1's slot, card already in hand
        // over the first half of the travel
        target = mix(PARK_LEFT, PLACE1, ease((pp - 0.06) / 0.18))
        setCard(1)
      } else if (pp <= 0.32) {
        // place card 1: the 3D card melts into the DOM card
        target = PLACE1
        setCard(1 - clamp01((pp - 0.24) / 0.08))
      } else if (pp <= 0.46) {
        // return to the left park while the supporting text fades in
        target = mix(PLACE1, PARK_LEFT, ease((pp - 0.32) / 0.14))
        setCard(0)
      } else if (pp <= 0.91) {
        // idle at the left while the chain cascades, the quote lands, and
        // the finished table HOLDS (quote full ≈0.79 → collect at 0.91)
        target = PARK_LEFT
        setCard(0)
      } else if (pp <= 0.98) {
        // THE COLLECT: the hand sweeps the chain row left -> right,
        // gathering the five cards into a growing deck. Visibility is
        // recomputed from handX every tick, so reverse scrolling restores
        // the row. Arrows hide together with the card that precedes them.
        const t = clamp01((pp - 0.91) / 0.07)
        const handX = lerp(chain.left - 60, chain.right + 90, t)
        const links = Array.from(stageRef.current.querySelectorAll('.proh-chain .proh-link'))
        let prevHidden = false
        for (const link of links) {
          const cardEl = link.querySelector('.proh-card')
          const arrowEl = link.querySelector('.proh-arrow')
          if (!cardEl) continue
          const r = cardEl.getBoundingClientRect()
          const hidden = handX >= r.left + r.width / 2
          cardEl.style.transition = 'opacity 0.25s'
          cardEl.style.opacity = hidden ? '0' : ''
          if (arrowEl) {
            arrowEl.style.transition = 'opacity 0.25s'
            arrowEl.style.opacity = prevHidden ? '0' : ''
          }
          prevHidden = hidden
        }
        collectDirtyRef.current = true
        target = {
          x: Math.min(Math.max(handX, 70), vw - 70),
          y: chain.bottom - 35,
          scale: placeScale,
          rotZ: 0.05,
          rotX: -0.12,
          rotY: Math.PI + 0.1,
        }
        setCard(t)
      } else {
        // after the collect: settle into the right-edge park KEEPING the
        // gathered cards — section 11 starts with them in hand
        const t = ease(clamp01((pp - 0.98) / 0.02))
        const SWEEP_END = {
          x: Math.min(Math.max(chain.right + 90, 70), vw - 70),
          y: chain.bottom - 35,
          scale: placeScale,
          rotZ: 0.05,
          rotX: -0.12,
          rotY: Math.PI + 0.1,
        }
        target = mix(SWEEP_END, PARK_RIGHT, t)
        setCard(1) // the swept-up cards stay in hand for section 11
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
