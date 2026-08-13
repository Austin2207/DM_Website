import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { PACKAGES } from './PackagesSection.jsx'
import './results.css'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setDeckTheme,
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

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

/*
 * 09 · The reveal — the hand places the question card; ACTIVATING the card
 * flips it to A5 and then automatically transforms it into one large card
 * holding the complete ranking. No extra scroll between the two states.
 */
export default function ResultsSection() {
  const stageRef = useRef(null)
  const cardSlotRef = useRef(null)
  const bigRef = useRef(null)
  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })

  const [flipped, setFlipped] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const dirtyRef = useRef(false)
  const expandedRef = useRef(false)
  const timerRef = useRef(null)

  const expand = () => {
    if (expandedRef.current) return
    expandedRef.current = true
    setExpanded(true)
  }
  const activate = () => {
    if (dirtyRef.current) return
    dirtyRef.current = true
    setFlipped(true)
    // let the flip land, then transform into the big results card by itself
    timerRef.current = setTimeout(expand, 1000)
  }

  useEffect(() => {
    const director = () => {
      const r = stageRef.current?.getBoundingClientRect()
      if (!r) return
      const vh = window.innerHeight
      const active = r.top < vh
      const rp = clamp01(-r.top / (r.height - vh))
      raw.set(rp)
      // reverse scroll un-places the card → the whole interaction resets
      if (rp < 0.16 && dirtyRef.current) {
        dirtyRef.current = false
        expandedRef.current = false
        clearTimeout(timerRef.current)
        setFlipped(false)
        setExpanded(false)
      }

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(9)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      // 08 leaves the hand at this visible handoff point, card in palm
      const HANDOFF = {
        x: vw * 0.5,
        y: vh * 0.78,
        scale: desktop ? 0.7 : 0.5,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }
      const slot = cardSlotRef.current?.getBoundingClientRect()
      const SPOT = slot
        ? {
            x: Math.min(slot.right + 55, vw - 70),
            y: slot.bottom - 35,
            scale: desktop ? 0.62 : 0.45,
            rotZ: 0.05,
            rotX: -0.12,
            rotY: Math.PI + 0.1,
          }
        : HANDOFF
      // waiting in view at the card's bottom-right (Austin's reference shot)
      const WAIT = slot
        ? {
            x: Math.min(slot.right + 60, vw - 70),
            y: slot.bottom + 30,
            scale: desktop ? 0.7 : 0.5,
            rotZ: 0,
            rotX: -0.1,
            rotY: Math.PI + 0.15,
          }
        : HANDOFF
      const big = bigRef.current?.getBoundingClientRect()
      const PICK = big
        ? {
            x: Math.min(big.right - 60, vw - 70),
            y: big.bottom - 35,
            scale: desktop ? 0.62 : 0.45,
            rotZ: 0.05,
            rotX: -0.12,
            rotY: Math.PI + 0.1,
          }
        : WAIT
      const PARK_LEFT = {
        x: desktop ? 70 : 50,
        y: vh * 0.52,
        scale: desktop ? 0.55 : 0.45,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }

      setDeckTheme({ color: '#7B5EA7', glyph: '★' })
      setCardMode(1)
      setPose('grip')
      hand.mirror = 0
      hand.cardOverride = null
      if (rp <= 0) {
        setHandTarget(HANDOFF, 0.12) // visible, card in palm — no vanishing
        setCard(1)
      } else if (rp <= 0.2) {
        // the hand carries that same card straight to the placement area
        const t = ease(rp / 0.2)
        setHandTarget(mix(HANDOFF, SPOT, t), 0.12)
        setCard(1)
      } else if (rp <= 0.28) {
        // ...and places it on the board
        setHandTarget(SPOT, 0.12)
        setCard(1 - clamp01((rp - 0.2) / 0.08))
      } else if (rp <= 0.4) {
        // then steps aside to the card's bottom-right and WAITS in view
        const t = ease((rp - 0.28) / 0.12)
        setHandTarget(mix(SPOT, WAIT, t), 0.12)
        setCard(0)
      } else if (rp <= 0.86) {
        setHandTarget(WAIT, 0.12) // visible company while the audience clicks
        setCard(0)
      } else if (rp <= 0.94) {
        // the end is a PICKUP: the hand takes the card off the board
        const t = clamp01((rp - 0.86) / 0.08)
        setHandTarget(mix(WAIT, PICK, ease(t)), 0.12)
        setCard(t)
      } else {
        // ...and settles at the LEFT edge — 10 starts from here
        const t = ease((rp - 0.94) / 0.06)
        setHandTarget(mix(PICK, PARK_LEFT, t), 0.12)
        setCard(1) // the collected card stays in the palm — 10 starts with it
      }
    }
    director()
    window.addEventListener('scroll', director, { passive: true })
    window.addEventListener('resize', director)
    return () => {
      window.removeEventListener('scroll', director)
      window.removeEventListener('resize', director)
      clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // the exit is PHYSICAL: the hand picks the card up [0.86–0.94] — content
  // melts into the hand, not into thin air
  const pick = (v) => clamp01((v - 0.86) / 0.08)
  const headerOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.06) * (1 - clamp01((v - 0.92) / 0.08)))
  // the question card exists once the hand has placed it (state clears it)
  const cardOp = useTransform(p, (v) => clamp01((v - 0.2) / 0.08) * (1 - pick(v)))
  const graphOutOp = useTransform(p, (v) => 1 - pick(v))

  const loss = (pk) => parseFloat(pk.mean.replace(/[^0-9.]/g, ''))
  const order = [...PACKAGES].sort((a, b) => loss(a) - loss(b))
  const max = 18.61

  return (
    <section className="rev2-stage hand-stage" data-order="9" id="results" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>09 · The reveal</span>
          </div>
          <h2 className="team-heading">
            So who
            <br />
            won?
          </h2>
        </motion.div>

        <div className="rev2-center">
          {/* the question card — placed by the hand, cleared by its own
              transformation (not by scroll) */}
          <motion.div className="rev2-card-wrap" style={{ opacity: cardOp }}>
            <motion.div
              animate={{ opacity: expanded ? 0 : 1, scale: expanded ? 1.06 : 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{ pointerEvents: expanded ? 'none' : 'auto' }}
            >
              <div
                className={`rev2-card${flipped ? ' rev2-flipped' : ''}`}
                onClick={activate}
                ref={cardSlotRef}
              >
                <div className="rev2-card-inner">
                  <div className="rev2-face rev2-front">
                    <span className="rev2-corner">?</span>
                    <span className="rev2-q">So who won?</span>
                    <span className="rev2-corner rev2-corner-btm">?</span>
                  </div>
                  <div className="rev2-face rev2-back">
                    <span className="rev2-corner">★</span>
                    <span className="rev2-medal">🥇</span>
                    <span className="rev2-winner">A5 · Balanced</span>
                    <span className="rev2-wins">wins 1,500 / 1,500 simulated futures</span>
                    <span className="rev2-corner rev2-corner-btm">★</span>
                  </div>
                </div>
              </div>
              {!flipped && <span className="rev2-hint">click to reveal</span>}
            </motion.div>
          </motion.div>

          {/* ...which becomes one large card carrying the complete ranking */}
          <motion.div className="rev2-graph-wrap" style={{ opacity: graphOutOp }}>
            <motion.div
              className="rev2-graph rev2-bigcard"
              ref={bigRef}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: expanded ? 1 : 0, scale: expanded ? 1 : 0.94 }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{ pointerEvents: expanded ? 'auto' : 'none' }}
            >
              <div className="res-bars">
                {order.map((pk, i) => (
                  <div className={`res-row${pk.star ? ' best' : ''}`} key={pk.rank}>
                    <span className="res-label">
                      <b style={{ color: pk.color }}>{pk.glyph}</b> {pk.rank} · {pk.name}
                      {pk.star && <span className="res-star">our hand</span>}
                    </span>
                    <span className="res-track">
                      <motion.span
                        className="res-fill"
                        style={{ background: pk.color }}
                        initial={{ width: '0%' }}
                        animate={{ width: expanded ? `${(loss(pk) / max) * 100}%` : '0%' }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.14 }}
                      />
                    </span>
                    <span className="res-mean">{pk.mean}</span>
                  </div>
                ))}
              </div>
              <div className="rev-badges">
                <span className="rev-badge-first">🥇 1st place — A5 · Balanced</span>
                <span className="rev-badge-wins">wins 1,500 / 1,500 simulated futures</span>
              </div>
              <p className="eq-example">
                The negative sign matters: no policy makes gambling a net social positive — A5
                simply produces the <b>least</b> net loss, ≈ <b>$4.9B a year better</b> than
                doing nothing. The costlier and more frequent the scandals (the strongest
                driver, r&nbsp;=&nbsp;0.80), the bigger A5&rsquo;s edge.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
