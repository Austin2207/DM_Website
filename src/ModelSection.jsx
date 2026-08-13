import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import {
  hand,
  modelTune,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setCardFace,
  setCardSpin,
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

const UNC = [
  'How many are addicted?',
  'Harm per dollar lost · λ',
  'Do rules actually work?',
  'Scandal rate & cost',
]

/*
 * 07 · The model.
 * Opening: the title sits on the LEFT while the hand — slightly right of
 * center so nothing overlaps the title — spins the influence-diagram CARD
 * above its palm. Clear intro buffer. Then the title fades, the hand
 * carries the card toward center and presents it upward: the card grows
 * into the board (in a portal ABOVE the hand layer — the board covers the
 * wrist, never the fingers) while the hand descends into Austin's locked
 * pose. Labels appear OUTSIDE the board on its left, then light up.
 * Complete composition → generous buffer → dissolve straight into 08.
 */
export default function ModelSection() {
  const stageRef = useRef(null)
  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })
  const [onStage, setOnStage] = useState(false)
  const onStageRef = useRef(false)

  const out = (v) => 1 - clamp01((v - 0.94) / 0.05)
  const headerOp = useTransform(p, (v) =>
    Math.min(clamp01((v - 0.02) / 0.06), 1 - clamp01((v - 0.32) / 0.08)),
  )
  const diagOp = useTransform(p, (v) => clamp01((v - 0.32) / 0.1) * out(v))
  const diagScale = useTransform(p, (v) => 0.5 + 0.5 * ease(clamp01((v - 0.32) / 0.24)))
  const appearOps = UNC.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(p, (v) => clamp01((v - (0.56 + i * 0.035)) / 0.05) * out(v)),
  )
  const litOps = UNC.map((_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(p, (v) => clamp01((v - (0.68 + i * 0.028)) / 0.045) * out(v)),
  )
  const methodOp = useTransform(p, (v) => clamp01((v - 0.78) / 0.05) * out(v))

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const mp = clamp01(-stage.top / (stage.height - vh))
      raw.set(mp)

      const show = active && stage.bottom > 0
      if (show !== onStageRef.current) {
        onStageRef.current = show
        setOnStage(show)
      }

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(7)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      // 06 leaves the hand idling at the right edge
      const PARK = desktop
        ? { x: vw - 70, y: vh * 0.52, scale: 0.55, rotZ: 0.05, rotX: -0.12, rotY: Math.PI + 0.1 }
        : { x: vw - 50, y: vh * 0.5, scale: 0.45, rotZ: 0.05, rotX: -0.12, rotY: Math.PI + 0.1 }
      // slightly right of center: the title owns the left half
      const OPEN_RIGHT = desktop
        ? { x: vw * 0.66, y: vh * 0.58, scale: 1.05, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        : { x: vw * 0.5, y: vh * 0.58, scale: 0.7, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
      // Austin's locked presenting pose (x .55 · y .85 · scale 1.10)
      const TUNE = desktop
        ? { x: vw * modelTune.x, y: vh * modelTune.y, scale: modelTune.scale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        : { x: vw * 0.5, y: vh * (modelTune.y + 0.04), scale: modelTune.scale * 0.64, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }

      setCardMode(0)
      setCardSpin(true)
      setCardFace(mp <= 0.4 ? 'diagram' : 'deck')
      if (mp > 0) {
        if (mp <= 0.12) {
          // the hand opens right-of-center; the diagram card materializes
          const t = ease(mp / 0.12)
          setHandTarget(mix(PARK, OPEN_RIGHT, t), 0.12)
          setPose(t > 0.4 ? 'flat' : 'grip')
          setCard(clamp01((mp - 0.06) / 0.08))
        } else if (mp <= 0.32) {
          // INTRO BUFFER: title left, spinning diagram card on the palm
          setHandTarget(OPEN_RIGHT, 0.12)
          setPose('flat')
          setCard(1)
        } else if (mp <= 0.52) {
          // the title fades; the hand CARRIES the card to center and down
          // while the card grows into the board above it
          const t = ease((mp - 0.32) / 0.2)
          setHandTarget(mix(OPEN_RIGHT, TUNE, t), 0.12)
          setPose('flat')
          setCard(1 - clamp01((mp - 0.32) / 0.08))
        } else if (mp <= 0.94) {
          // labels appear + light up, then the long completion buffer
          setHandTarget(TUNE, 0.12)
          setPose('flat')
          setCard(0)
        } else {
          // deliberate scroll: dissolve, hand sinks — straight into 08
          const t = ease((mp - 0.94) / 0.06)
          setHandTarget(mix(TUNE, { ...TUNE, y: vh * 1.6 }, t), 0.12)
          setPose('flat')
          setCard(0)
        }
      } else {
        setHandTarget(PARK, 0.12)
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
    <section className="model-stage hand-stage" data-order="7" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>07 · The model</span>
          </div>
          <h2 className="team-heading">
            How does policy
            <br />
            become an outcome?
          </h2>
        </motion.div>
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="model-portal" style={{ display: onStage ? 'flex' : 'none' }}>
            <div className="model-wrap">
              <div className="model-labels-out">
                {UNC.map((u, i) => (
                  <span className="m-label" key={u}>
                    <motion.span className="m-label-base" style={{ opacity: appearOps[i] }}>
                      {u}
                    </motion.span>
                    <motion.span className="m-label-lit" style={{ opacity: litOps[i] }}>
                      {u}
                    </motion.span>
                  </span>
                ))}
                <motion.span className="m-label-method" style={{ opacity: methodOp }}>
                  probability wheel · bias controls · 35 sources
                </motion.span>
              </div>
              <motion.div
                className="model-board"
                style={{ opacity: diagOp, scale: diagScale, originY: 0.92 }}
              >
                <img src="/diagram.png" alt="The causal decision network" />
                <span className="model-board-caption">
                  Policy changes behavior → behavior moves the money → that sets revenue, harm
                  and integrity → those decide the final score
                </span>
              </motion.div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  )
}
