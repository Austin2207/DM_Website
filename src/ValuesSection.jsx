import { Fragment, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setDeckTheme,
  laterStageActive,
} from './hand3d/handBus.js'
import './values.css'

const EASE = [0.16, 1, 0.3, 1]
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

const CARDS = [
  {
    sign: '+',
    label: 'Government revenue',
    accent: '#4E7D58',
    base: '+$3.94B',
    back: 'Legal-channel losses × (22% state tax + 2.45% excise) + prediction-market tax if regulated.',
  },
  {
    sign: '+',
    label: 'Fun of betting',
    accent: '#C29B45',
    base: '$0.00B',
    back: 'A visible dial, default $0. Whose enjoyment counts is a value judgment, not a fact.',
  },
  {
    sign: '−',
    label: 'Harm to people',
    accent: '#B5484D',
    base: '−$6.89B',
    back: 'λ × losses of the addicted + 0.2 × at-risk losses. Illegal-channel losses weighted ×1.5.',
  },
  {
    sign: '−',
    label: 'Rigged games',
    accent: '#3E8E8C',
    base: '−$3.01B',
    back: 'Expected federal cases × cost per case. Only monitored money is defensible.',
  },
  {
    sign: '−',
    label: 'Administration',
    accent: '#4A6FA5',
    base: '−$0.00B',
    back: 'Direct federal cost of the alternative. −$0.15B if we study first.',
  },
]

const DIALS = [
  {
    t: 'Whose fun counts',
    d: 'Bettor enjoyment defaults to $0 — a deliberate value judgment, carried as a visible dial, not a hidden assumption.',
  },
  {
    t: 'Who bears the harm',
    d: 'Losses concentrate in the addicted 2.5% of bettors — so tax revenue is partly financed by the harmed. The λ dial that prices this stays on the table.',
  },
  {
    t: 'Risk attitude, elicited',
    d: 'For the 50-50 deal {−$4B, −$12B} the certain equivalent came out −$9B: risk averse, risk tolerance ρ ≈ $7B.',
  },
]

/*
 * 06 · Clear values — a pinned hand-stage. The hand carries the deck in
 * from section 05, PLACES the Net-social-value card into its dashed slot
 * on the whiteboard, then parks at the right edge while the audience
 * clicks the card open into the full equation.
 */
export default function ValuesSection() {
  const stageRef = useRef(null)
  const slotRef = useRef(null)
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const collectDirtyRef = useRef(false)
  const [flipped, setFlipped] = useState(() => CARDS.map(() => false))
  const activate = () => {
    openRef.current = true
    setOpen(true)
  }

  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })

  // whiteboard rule: everything fades in place — but only AFTER the hand has
  // collected the cards [0.78–0.94]; the leftovers dissolve over [0.94–1.0];
  // entrances are opacity-only (slight scale on cards ok)
  const sectionOp = useTransform(p, (v) => 1 - clamp01((v - 0.94) / 0.06))
  const headerOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.08))
  const boardOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.08))
  // the placement: DOM card fades in exactly as the 3D card melts out
  const nsvOp = useTransform(p, (v) => clamp01((v - 0.28) / 0.08))
  const nsvScale = useTransform(nsvOp, (v) => 0.94 + 0.06 * v)
  const nsvEvents = useTransform(nsvOp, (v) => (v > 0.6 ? 'auto' : 'none'))
  const ghostOp = useTransform(p, (v) => 1 - clamp01((v - 0.28) / 0.08))

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const pp = clamp01(-stage.top / (stage.height - vh))
      raw.set(pp)

      // reverse scroll takes the NSV card away → the fan and its texts vanish
      // WITH it, and the expanded state fully resets; re-placing the card does
      // NOT auto-reopen — it must be clicked again
      if (pp < 0.3 && openRef.current) {
        openRef.current = false
        setOpen(false)
        setFlipped(CARDS.map(() => false))
      }

      // reverse scroll out of the collect: clear the sweep's inline opacities
      // once so the equation row is pristine again
      if (pp < 0.76 && collectDirtyRef.current) {
        collectDirtyRef.current = false
        stageRef.current
          ?.querySelectorAll('.val-eq-row .val-card, .val-eq-row .val-joiner, .val-eq-row .val-equals')
          .forEach((el) => {
            el.style.opacity = ''
            el.style.transition = ''
          })
      }

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(6)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      // must match PackagesSection's HOLD so the 05 → 06 handoff is seamless
      const HOLD = desktop
        ? { x: vw * 0.5, y: vh * 0.4, scale: 0.75, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
        : { x: vw * 0.5, y: vh * 0.36, scale: 0.55, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      const PARK_RIGHT = {
        x: vw - 70,
        y: vh * 0.52,
        scale: desktop ? 0.55 : 0.45,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }
      const slot = slotRef.current?.getBoundingClientRect()
      const PLACE = slot
        ? {
            x: Math.min(slot.right + 55, vw - 70),
            y: slot.bottom - 35,
            scale: desktop ? 0.62 : 0.45,
            rotZ: 0.05,
            rotX: -0.12,
            rotY: Math.PI + 0.1,
          }
        : HOLD

      setDeckTheme({ color: '#1f1f1f', glyph: '★' })
      setPose('grip')
      setCardMode(1)

      let target
      if (pp <= 0.06) {
        // seamless handoff from 05: deck in hand, upright
        target = HOLD
        setCard(1)
      } else if (pp <= 0.28) {
        // travel to the dashed NSV slot, deck still in hand
        const t = ease((pp - 0.06) / 0.22)
        target = mix(HOLD, PLACE, t)
        setCard(1)
      } else if (pp <= 0.36) {
        // THE PLACEMENT: the 3D card melts into the DOM card at the slot
        target = PLACE
        setCard(1 - clamp01((pp - 0.28) / 0.08))
      } else if (pp <= 0.5) {
        // withdraw to the right edge, empty-handed
        const t = ease((pp - 0.36) / 0.14)
        target = mix(PLACE, PARK_RIGHT, t)
        setCard(0)
      } else if (pp <= 0.78) {
        // interactive hold: motionless at the right edge while the audience
        // opens the card and flips the terms
        target = PARK_RIGHT
        setCard(0)
      } else if (pp <= 0.94) {
        // THE COLLECT: the hand sweeps the equation row right -> left,
        // gathering the cards into a growing deck. Visibility is recomputed
        // from handX every tick, so reverse scrolling restores the row.
        // When the fan was never opened, only the NSV card is there to take.
        const rowRect = stageRef.current
          ?.querySelector('.val-eq-row')
          ?.getBoundingClientRect()
        if (rowRect) {
          const t = clamp01((pp - 0.78) / 0.16)
          const handX = lerp(rowRect.right + 90, rowRect.left - 60, t)
          const cards = Array.from(
            stageRef.current.querySelectorAll(
              '.val-eq-row .val-card, .val-eq-row .val-joiner, .val-eq-row .val-equals'
            )
          )
          for (const el of cards) {
            const r = el.getBoundingClientRect()
            el.style.transition = 'opacity 0.25s'
            el.style.opacity = handX <= r.left + r.width / 2 ? '0' : ''
          }
          collectDirtyRef.current = true
          target = {
            x: Math.min(Math.max(handX, 70), vw - 70),
            y: rowRect.bottom - 35,
            scale: desktop ? 0.62 : 0.45,
            rotZ: 0.05,
            rotX: -0.12,
            rotY: Math.PI + 0.1,
          }
          setCard(t)
        } else {
          target = PARK_RIGHT
          setCard(0)
        }
      } else {
        // after the collect: back toward the right-edge park while the
        // gathered deck melts away — section 07 expects the hand parked at
        // PARK_RIGHT with card 0, so end there exactly
        const t = ease(clamp01((pp - 0.94) / 0.06))
        const rowRect = stageRef.current
          ?.querySelector('.val-eq-row')
          ?.getBoundingClientRect()
        const SWEEP_END = rowRect
          ? {
              x: Math.min(Math.max(rowRect.left - 60, 70), vw - 70),
              y: rowRect.bottom - 35,
              scale: desktop ? 0.62 : 0.45,
              rotZ: 0.05,
              rotX: -0.12,
              rotY: Math.PI + 0.1,
            }
          : PARK_RIGHT
        target = mix(SWEEP_END, PARK_RIGHT, t)
        setCard(1 - clamp01((pp - 0.94) / 0.06))
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

  const flip = (i) => setFlipped((f) => f.map((v, j) => (j === i ? !v : v)))

  return (
    <section className="values-stage hand-stage" data-order="6" id="values" ref={stageRef}>
      <div className="pin-inner team-pin values-pin">
        <motion.div className="values-board" style={{ opacity: sectionOp }}>
          <motion.div className="values-head" style={{ opacity: headerOp }}>
            <div className="subtitle">
              <span className="subtitle-dot" />
              <span>06 · Clear values</span>
            </div>
            <h2 className="team-heading values-heading">
              How do we score
              <br />
              a policy?
            </h2>
            <p className="dq-lead values-lead">
              Before the model can pick a winner, we need one yardstick. Not tax revenue — one
              monetary measure of net social value, $ billions per year, defined before any utility
              talk, so every alternative is priced by the same recipe.
            </p>
          </motion.div>

          <motion.div className="val-eq-row" style={{ opacity: boardOp }}>
            <div className="val-slot" ref={slotRef}>
              <motion.div className="val-ghost" style={{ opacity: ghostOp }} aria-hidden="true" />
              <motion.div
                className={`val-card val-nsv${open ? ' val-open' : ''}`}
                style={{ opacity: nsvOp, scale: nsvScale, pointerEvents: nsvEvents }}
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={activate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') activate()
                }}
              >
                <div className="val-face val-front">
                  <span className="val-rank">NSV</span>
                  <span className="val-nsv-title">Net social value</span>
                  <span className="val-nsv-unit">$B / yr</span>
                  {!open && <span className="val-hint">click me</span>}
                  <span className="val-rank val-rank-b">NSV</span>
                </div>
              </motion.div>
            </div>

            {open && (
              <>
                <motion.span
                  className="val-equals"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  =
                </motion.span>
                {CARDS.map((c, i) => (
                  <Fragment key={c.label}>
                    {i > 0 && (
                      <motion.span
                        className="val-joiner"
                        style={{ '--vc': c.accent }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.09 }}
                      >
                        {c.sign}
                      </motion.span>
                    )}
                    <motion.div
                      className={`val-card val-term${flipped[i] ? ' val-flipped' : ''}`}
                      style={{ '--vc': c.accent }}
                      role="button"
                      tabIndex={0}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.55, ease: EASE, delay: 0.14 + i * 0.09 }}
                      onClick={() => flip(i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') flip(i)
                      }}
                    >
                      <div className="val-inner">
                        <div className="val-face val-front">
                          <span className="val-rank">{c.sign}</span>
                          <span className="val-sign-big">{c.sign}</span>
                          <span className="val-name">{c.label}</span>
                          <span className="val-base">{c.base}</span>
                          <span className="val-rank val-rank-b">{c.sign}</span>
                        </div>
                        <div className="val-face val-back">
                          <span className="val-back-name">{c.label}</span>
                          <p className="val-back-text">{c.back}</p>
                          <span className="val-back-hint">click to flip back</span>
                        </div>
                      </div>
                    </motion.div>
                  </Fragment>
                ))}
              </>
            )}
          </motion.div>

          <motion.p className="eq-example values-example" style={{ opacity: boardOp }}>
            Worked example — status quo, base case: +3.94 + 0 − 6.89 − 3.01 − 0 = <b>−$5.96B</b>.
          </motion.p>

          <motion.div className="values-dials" style={{ opacity: boardOp }}>
            {DIALS.map((r, i) => (
              <div className="values-dial" key={r.t}>
                <span className="values-dial-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{r.t}</h3>
                <p>{r.d}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
