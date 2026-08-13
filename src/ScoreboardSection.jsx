import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import './scoreboard.css'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setCardFace,
  setCardSpin,
  setDeckTheme,
  finaleTune,
  curtainTune,
  thanksTune,
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

/*
 * 13 · The scoreboard, then the curtain.
 * The hand's turn continues straight through the approach (no frozen
 * slam pose), presses its card into the giant scoreboard, rests with
 * fingertips at the bottom edge — then walks to the far LEFT, grabs the
 * curtain and pulls it across the stage. The curtain keeps travelling
 * right as the Thank-you screen scrolls in beneath it: a theatrical wipe,
 * not a fade.
 */
export default function ScoreboardSection() {
  const stageRef = useRef(null)
  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })
  const curtainRaw = useMotionValue(-100)
  const curtainSpring = useSpring(curtainRaw, { stiffness: 160, damping: 30 })
  const curtainX = useTransform(curtainSpring, (v) => `${v}vw`)
  const [onStage, setOnStage] = useState(false)
  const onStageRef = useRef(false)

  const giantOp = useTransform(p, (v) => clamp01((v - 0.04) / 0.14))
  const giantScale = useTransform(p, (v) => 0.45 + 0.55 * ease(clamp01((v - 0.03) / 0.23)))
  const contentOp = useTransform(p, (v) => clamp01((v - 0.26) / 0.14))

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const sp = clamp01(-stage.top / (stage.height - vh))
      raw.set(sp)

      const show = active && stage.bottom > -vh
      if (show !== onStageRef.current) {
        onStageRef.current = show
        setOnStage(show)
      }

      // the WHITE ending slide: pulled in from the left over [0.62–0.92] and
      // it STAYS — it becomes the final stage; the Thank-you fades in on it
      const coverT = ease(clamp01((sp - 0.62) / 0.3))
      curtainRaw.set(-100 + coverT * 100)

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if ((q.has('tune') && !window.__tuneLive) || q.get('rz') || q.get('rx') || q.get('ry')) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      // must mirror FinaleSection's OPEN (tunable via ?tune → 12手)
      const OPEN = desktop
        ? { x: vw * finaleTune.x, y: vh * finaleTune.y, scale: finaleTune.scale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        : { x: vw * 0.5, y: vh * 0.64, scale: 0.75, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
      const PLACE = desktop
        ? { x: vw * 0.5, y: vh * 0.42, scale: 0.95, rotZ: -0.05, rotX: -0.35, rotY: Math.PI + 0.1 }
        : { x: vw * 0.5, y: vh * 0.4, scale: 0.68, rotZ: -0.05, rotX: -0.35, rotY: Math.PI + 0.1 }
      const PEEK = desktop
        ? { x: vw * 0.5, y: vh * thanksTune.peekY, scale: 0.9, rotZ: 0, rotX: -0.1, rotY: Math.PI + 0.15 }
        : { x: vw * 0.5, y: vh * (thanksTune.peekY - 0.04), scale: 0.65, rotZ: 0, rotX: -0.1, rotY: Math.PI + 0.15 }
      // dragging fabric sideways — only the fingers and a sliver of hand
      // need to show at the edge; Austin tunes this via ?tune (幕布)
      const curtainGrip = (t) => ({
        x: Math.min(Math.max(t * vw + curtainTune.dx, 40), vw + 240),
        y: vh * 0.5 + curtainTune.dy,
        scale: (desktop ? 1 : 0.75) * curtainTune.scale,
        rotZ: curtainTune.rotZ,
        rotX: -0.1,
        rotY: Math.PI + 0.1,
      })
      // resting after the slide settles: SAME height and size as the pull
      // (no jump), only the horizontal is adjustable — ?tune (14手)
      const REST = {
        x: vw * thanksTune.x,
        y: vh * 0.5 + curtainTune.dy,
        scale: (desktop ? 1 : 0.75) * curtainTune.scale,
        rotZ: curtainTune.rotZ,
        rotX: -0.1,
        rotY: Math.PI + 0.1,
      }

      setDeckTheme({ color: '#7B5EA7', glyph: '★' })
      setCardFace('deck')
      setCardSpin(true)
      setCardMode(0)
      if (sp <= 0) {
        // the finale began the turn at 0.35 — CONTINUE it through the
        // approach so the slam pose never freezes
        const approach = clamp01(1 - stage.top / vh)
        const t = 0.35 + 0.3 * ease(approach)
        setHandTarget(mix(OPEN, PLACE, t), 0.12)
        setPose(t > 0.55 ? 'grip' : 'flat')
        setCard(1)
      } else if (sp <= 0.2) {
        // finish the turn and press the card onto the screen
        const t = 0.65 + 0.35 * ease(sp / 0.2)
        setHandTarget(mix(OPEN, PLACE, t), 0.12)
        setPose('grip')
        setCard(1 - clamp01((sp - 0.02) / 0.12))
      } else if (sp <= 0.36) {
        // slide down until only the fingertips peek over the bottom edge
        const t = ease((sp - 0.2) / 0.16)
        setHandTarget(mix(PLACE, PEEK, t), 0.12)
        setPose('grip')
        setCard(0)
      } else if (sp <= 0.52) {
        setHandTarget(PEEK, 0.12) // scoreboard reading buffer
        setPose('grip')
        setCard(0)
      } else if (sp <= 0.62) {
        // the hand walks to the far LEFT and takes the curtain edge
        const t = ease((sp - 0.52) / 0.1)
        setHandTarget(mix(PEEK, curtainGrip(0), t), 0.12)
        setPose('grip')
        setCard(0)
      } else if (sp <= 0.92) {
        // ...and PULLS the white ending slide across, left to right,
        // visibly attached to its leading edge the whole way
        const coverNow = ease(clamp01((sp - 0.62) / 0.3))
        setHandTarget(curtainGrip(coverNow), 0.12)
        setPose('grip')
        setCard(0)
      } else {
        // slide fully extended — the hand rests near the right edge (tunable),
        // and the Thank-you fades in on the white slide
        setHandTarget(REST, 0.12)
        setPose('grip')
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

  return (
    <section className="score-stage hand-stage" data-order="13" id="scoreboard" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div
          className="score-giant"
          style={{ opacity: giantOp, scale: giantScale, originX: 0.62, originY: 0.62 }}
        >
          <span className="score-corner tl">★</span>
          <span className="score-corner br">★</span>
          <motion.div className="score-content" style={{ opacity: contentOp }}>
            <div className="subtitle">
              <span className="subtitle-dot" />
              <span>14 · The scoreboard</span>
            </div>
            <h2 className="team-heading score-heading">
              You vs.
              <br />
              the model.
            </h2>
            <div className="score-cols">
              <div className="score-card score-you">
                <span className="score-tag">You</span>
                <h3>Your picks</h3>
                <p>
                  Live audience results land here once the game goes live. Scan the code in the
                  corner to lock in your policy.
                </p>
              </div>
              <div className="score-card score-model">
                <span className="score-tag">The model</span>
                <h3>A5 · Balanced ★</h3>
                <p>
                  First in 1,500 / 1,500 simulated futures. −$3.74B per year — the smallest
                  loss on the table.
                </p>
              </div>
            </div>
            <p className="score-closing">Did your intuition match the model?</p>
          </motion.div>
        </motion.div>
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <motion.div
            className="score-curtain"
            style={{ x: curtainX, display: onStage ? 'block' : 'none' }}
            aria-hidden
          />,
          document.body,
        )}
    </section>
  )
}
