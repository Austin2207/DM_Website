import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import QRCode from 'qrcode'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setCardFace,
  setCardSpin,
  setQrUrl,
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

/*
 * 04 · The game — the hand opens flat again (like the hero) and the QR code
 * floats above the palm, steady, no spin. Scan it, play, beat −$3.74B.
 */
export default function GameSection() {
  const stageRef = useRef(null)
  const urlRef = useRef('')
  const headerRaw = useMotionValue(0)
  const headerOp = useSpring(headerRaw, { stiffness: 150, damping: 28 })

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const target = q.get('qrurl') || window.location.origin + '/play.html'
    urlRef.current = target
    QRCode.toDataURL(target, { width: 600, margin: 2, color: { dark: '#0c0c0e', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const gp = clamp01(-stage.top / (stage.height - vh))

      // copy fades with the pin, gone before release
      headerRaw.set(Math.min(clamp01((gp - 0.08) / 0.12), 1 - clamp01((gp - 0.8) / 0.1)))

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(4)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      const HOLD = desktop
        ? { x: vw * 0.5, y: vh * 0.4, scale: 0.75, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
        : { x: vw * 0.5, y: vh * 0.36, scale: 0.55, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      // the open offering hand, like the hero
      const OPEN = desktop
        ? { x: vw * 0.62, y: vh * 0.62, scale: 1.15, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        : { x: vw * 0.5, y: vh * 0.6, scale: 0.75, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }

      if (gp > 0) {
        if (gp <= 0.18) {
          // the hand turns over and opens; the deck melts away
          const t = ease(gp / 0.18)
          setHandTarget(mix(HOLD, OPEN, t), 0.12)
          setPose(t > 0.5 ? 'flat' : 'grip')
          setCard(1 - t)
          setCardMode(1 - t)
          setCardFace('deck')
          setCardSpin(true)
        } else if (gp <= 0.4) {
          // the QR materializes above the open palm — steady, no spin
          const t = ease((gp - 0.18) / 0.22)
          setHandTarget(OPEN, 0.12)
          setPose('flat')
          setCardFace('qr')
          setCardSpin(false)
          setCardMode(0)
          setCard(t)
        } else if (gp <= 0.8) {
          // HOLD: scan time
          setHandTarget(OPEN, 0.12)
          setPose('flat')
          setCardFace('qr')
          setCardSpin(false)
          setCardMode(0)
          setCard(1)
        } else {
          // the QR fades; the hand closes back around a fresh deck
          const t = ease((gp - 0.8) / 0.14)
          setHandTarget(mix(OPEN, HOLD, t), 0.12)
          setPose(t > 0.5 ? 'grip' : 'flat')
          setCardFace(t > 0.5 ? 'deck' : 'qr')
          setCardSpin(t > 0.5)
          setCardMode(t)
          setCard(t > 0.5 ? t : 1 - t)
        }
      } else {
        // approach from the levers table: full deck, holding pattern
        setHandTarget(HOLD, 0.12)
        setPose('grip')
        setCardMode(1)
        setCardFace('deck')
        setCardSpin(true)
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

  return (
    <section className="game-stage hand-stage" data-order="4" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>04 · Your turn</span>
          </div>
          <h2 className="team-heading">
            Design the policy
            <br />
            you think is best.
          </h2>
          <ol className="game-steps">
            <li>Scan the code floating on the hand.</li>
            <li>Set the six switches the way you would.</li>
            <li>Don&rsquo;t overthink it — go with your intuition.</li>
            <li>At the end, we compare your answer with the model&rsquo;s.</li>
          </ol>
          <div className="member-tags">
            <span className="member-tag">scan now — vote while we continue</span>
            <span className="member-tag">no login · 30 seconds</span>
            <span className="member-tag">the code stays in the corner</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
