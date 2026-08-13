import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setCardFace,
  setCardSpin,
  setDeckTheme,
  laterStageActive,
  finaleTune,
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

/* 12 · Our recommendation — the finale: the hand returns with the A5 card
   and keeps holding it through the scoreboard below. */
export default function FinaleSection() {
  const stageRef = useRef(null)
  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })
  // whiteboard rule: the copy is DRAWN in place (fade only, no slide) — and
  // it fades OUT near the end, overlapping the start of the card-slam
  // copy arrives early, while the hand is still rising — 11's exit flows
  // straight into this with no solo-hand pause
  const out = (v) => 1 - clamp01((v - 0.84) / 0.12)
  const copyOp = useTransform(p, (v) => clamp01((v - 0.14) / 0.16) * out(v))
  // the six A5 settings deal themselves as mini cards, one per beat —
  // the same cardboard grammar as every other table
  const cardOps = [0, 1, 2, 3, 4, 5].map((i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(p, (v) => clamp01((v - (0.32 + i * 0.045)) / 0.05) * out(v)),
  )
  const statsOp = useTransform(p, (v) => clamp01((v - 0.6) / 0.06) * out(v))
  // complete ≈ 0.66 → generous buffer [0.66–0.84] → exit overlaps the slam

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const fp = clamp01(-stage.top / (stage.height - vh))
      raw.set(fp)

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(12)) return // the scoreboard takes the hand from here
      const vw = window.innerWidth
      const desktop = isDesktop()

      // the hero offering pose, one last time — with our purple A5 on the palm
      const OPEN = desktop
        ? { x: vw * finaleTune.x, y: vh * finaleTune.y, scale: finaleTune.scale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        : { x: vw * 0.5, y: vh * 0.64, scale: 0.75, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }

      setDeckTheme({ color: '#7B5EA7', glyph: '★' })
      setCardFace('deck')
      setCardSpin(true)
      setPose('flat')
      if (fp <= 0.2) {
        // 12 hands over HERE, pile in palm: the grip melts into the floating
        // purple A5 while the hand finishes its flip — no rise from below
        setHandTarget(OPEN, 0.12)
        setCardMode(1 - ease(fp / 0.2))
        setCard(1)
      } else if (fp <= 0.86) {
        setHandTarget(OPEN, 0.12)
        setCardMode(0)
        setCard(1)
      } else {
        // the copy is already fading — the hand BEGINS its turn here, so the
        // slam overlaps the fade instead of waiting for it (scoreboard
        // continues the motion from exactly this pose)
        const PLACE = desktop
          ? { x: vw * 0.5, y: vh * 0.42, scale: 0.95, rotZ: -0.05, rotX: -0.35, rotY: Math.PI + 0.1 }
          : { x: vw * 0.5, y: vh * 0.4, scale: 0.68, rotZ: -0.05, rotX: -0.35, rotY: Math.PI + 0.1 }
        const t = 0.35 * ease((fp - 0.86) / 0.14)
        setHandTarget(mix(OPEN, PLACE, t), 0.12)
        // the card floats in FRONT only while it must cover the wrist; the
        // INSTANT the turn is perceptible they no longer align, so the card
        // tucks behind the hand right here at the start of the rotation
        setCardMode(clamp01((t - 0.06) / 0.12))
        setCard(1)
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

  const A5 = [
    'All adults 21+ may bet',
    'Prediction markets regulated + taxed',
    'No props / micro-bets',
    'Basic player protections',
    'Tax 30% + treatment earmark',
    'Federal integrity rules',
  ]
  const GLYPHS = ['●', '▲', '■', '◆', '⬟', '★']

  return (
    <section className="finale-stage hand-stage" data-order="12" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="finale-copy" style={{ opacity: copyOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>13 · Our recommendation</span>
          </div>
          <h2 className="team-heading">
            Play the
            <br />
            Balanced hand.
          </h2>
          <p className="dq-lead">
            Legal access with targeted restrictions, real player protections, treatment
            funding, and federal integrity monitoring. The information cannot change this
            choice — so the recommendation is to act now.
          </p>
          <div className="fin-cards">
            {A5.map((t, i) => (
              <motion.div className="fin-card" key={t} style={{ opacity: cardOps[i] }}>
                <i>{String(i + 1).padStart(2, '0')}</i>
                <span>{t}</span>
                <em>{GLYPHS[i]}</em>
              </motion.div>
            ))}
          </div>
          <motion.div className="finale-stats" style={{ opacity: statsOp }}>
            <span>
              <b>≈ $4.9B/yr</b> better than the status quo
            </span>
            <span>
              <b>1,500 / 1,500</b> futures won
            </span>
          </motion.div>
          <motion.div className="cta-row" style={{ opacity: statsOp }}>
            <a className="btn-primary" href="https://beatourhand.vercel.app/" target="_blank" rel="noreferrer">
              Try to Beat It
            </a>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to the Table
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
