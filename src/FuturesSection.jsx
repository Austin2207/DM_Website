import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  setDeckTheme,
  setCardFace,
  laterStageActive,
  futuresTune,
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

/* Every one of the 1,500 futures gets its own deterministic, plausible
   result — hash the future's number into attribute picks and draw values.
   A5 stays inside its simulated band and ranks first in every draw. */
const ADD = ['Low addiction', 'Base addiction', 'High addiction']
const EFF = ['Rules over-perform', 'Base rule effectiveness', 'Rules half-work']
const SCA = ['Quiet scandal year', 'Base scandal rate', 'Costly federal cases']
const fmt = (x) => `−$${Math.abs(x).toFixed(1)}B`
const makeFuture = (n) => {
  const h = Math.imul(n + 7, 2654435761) >>> 0
  // one full draw: all six alternatives, A5 first — spacings vary per future
  const a5 = -(2.0 + ((h >>> 6) % 371) / 100) // −2.0 … −5.7  (P90…P10)
  const a2 = a5 - (0.6 + ((h >>> 9) % 110) / 100)
  const a4 = a2 - (0.05 + ((h >>> 11) % 60) / 100)
  const a3 = a4 - (1.8 + ((h >>> 13) % 160) / 100)
  const a1 = a3 - (0.4 + ((h >>> 16) % 120) / 100)
  const a6 = a1 - (7.0 + ((h >>> 18) % 420) / 100)
  return {
    rows: [ADD[h % 3], EFF[(h >>> 2) % 3], SCA[(h >>> 4) % 3]],
    alts: [
      ['A5', fmt(a5)],
      ['A2', fmt(a2)],
      ['A4', fmt(a4)],
      ['A3', fmt(a3)],
      ['A1', fmt(a1)],
      ['A6', fmt(a6)],
    ],
  }
}

/*
 * 08 · Monte Carlo — the counter scrubs to 1,500; the future card shows the
 * SPECIFIC result of the future currently on the counter. The hand waits
 * below the frame; the reveal comes next.
 */
export default function FuturesSection() {
  const stageRef = useRef(null)
  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 150, damping: 28 })
  const lastN = useRef(-1)
  const cardWrapRef = useRef(null)
  const cardElRef = useRef(null)
  const [onStage, setOnStage] = useState(false)
  const onStageRef = useRef(false)
  const idRef = useRef(null)
  const rowRefs = useRef([])
  const altRefs = useRef([])

  // generous landing at 1,500 [0.58–0.86]; then the HAND picks the futures
  // card up [0.86–0.94] and carries it off below [0.94–1] — no plain fades
  const out = (v) => 1 - clamp01((v - 0.86) / 0.08)
  const headerOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.06) * out(v))
  const countOp = useTransform(p, (v) => clamp01((v - 0.08) / 0.06) * out(v))
  const count = useTransform(p, (v) =>
    Math.floor(clamp01((v - 0.12) / 0.46) * 1500).toLocaleString('en-US'),
  )
  const noteOp = useTransform(p, (v) => clamp01((v - 0.5) / 0.08) * out(v))
  // the card melts into the hand as it is picked up
  const cardOp = useTransform(p, (v) => clamp01((v - 0.13) / 0.05) * (1 - clamp01((v - 0.86) / 0.08)))

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const fp = clamp01(-stage.top / (stage.height - vh))
      raw.set(fp)

      const show = active && stage.bottom > 0
      if (show !== onStageRef.current) {
        onStageRef.current = show
        setOnStage(show)
      }

      // the card always describes the future the counter is showing —
      // one distinct result per value, all 1,500 of them
      const n = Math.max(1, Math.floor(clamp01((fp - 0.12) / 0.46) * 1500))
      if (n !== lastN.current) {
        lastN.current = n
        const f = makeFuture(n)
        if (idRef.current) idRef.current.textContent = `Future #${n.toLocaleString('en-US')}`
        f.rows.forEach((rw, i) => {
          if (rowRefs.current[i]) rowRefs.current[i].textContent = rw
        })
        f.alts.forEach(([name, val], i) => {
          if (altRefs.current[i]) altRefs.current[i].textContent = `${name}  ${val}`
        })
      }

      // the tuned card offsets/tilts apply every tick (live-tunable)
      const T = futuresTune
      if (cardWrapRef.current)
        cardWrapRef.current.style.transform = `translate(${T.cardX}px, ${T.cardY}px)`
      if (cardElRef.current)
        cardElRef.current.style.transform = `perspective(900px) rotateX(${T.cardRotX}deg) rotateY(${T.cardRotY + T.cardFlip}deg) rotateZ(${T.cardRotZ}deg) scale(${T.cardScale})`

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if ((q.has('tune') && !window.__tuneLive) || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(8)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      // the hand PRESENTS the futures card — open palm just beneath it,
      // the physical link between the diagram and the simulation
      // the card lives in a FIXED portal, so its rect never moves with the
      // scroll — the hand gets ONE stable target and flies straight to it
      const r0 = cardWrapRef.current?.getBoundingClientRect()
      const rect = r0 && r0.width > 10 ? r0 : null
      const PRESENT = rect
        ? {
            x: Math.min(Math.max(rect.left + rect.width / 2 + T.handDX, 70), vw - 60),
            y: Math.min(rect.bottom + T.handDY, vh * 0.94),
            scale: (desktop ? 1 : 0.72) * T.handScale,
            rotZ: T.handRotZ,
            rotX: T.handRotX,
            rotY: T.handRotY,
          }
        : { x: vw * 0.82, y: vh * 0.75, scale: 0.85, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
      const GRAB = rect
        ? {
            x: Math.min(rect.right + T.cardX + 55, vw - 70),
            y: Math.min(rect.bottom + T.cardY - 35, vh * 0.9),
            scale: desktop ? 0.62 : 0.45,
            rotZ: 0.05,
            rotX: -0.12,
            rotY: Math.PI + 0.1,
          }
        : PRESENT
      // visible handoff point — 09 takes the card from exactly here
      const HANDOFF = {
        x: vw * 0.5,
        y: vh * 0.78,
        scale: desktop ? 0.7 : 0.5,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }

      hand.mirror = fp < 0.94 ? T.handMirror : 0
      // the 3D palm card gets its own tuned offsets, separate from the DOM card
      hand.cardOverride = {
        dx: T.hcX,
        dy: T.hcY,
        scale: T.hcScale,
        tilt: (T.hcTilt * Math.PI) / 180,
      }
      setCardFace(fp < 0.04 ? 'diagram' : 'futures') // the magician's swap
      if (fp <= 0.86) {
        setHandTarget(PRESENT, 0.12)
        setPose('flat')
        setCardMode(0)
        // the caught card rides in until the futures interface takes over
        setCard(fp <= 0.1 ? 1 : fp <= 0.16 ? 1 - clamp01((fp - 0.1) / 0.06) : 0)
      } else if (fp <= 0.94) {
        // the hand reaches over and picks the futures card up
        const t = clamp01((fp - 0.86) / 0.08)
        setHandTarget(mix(PRESENT, GRAB, ease(t)), 0.12)
        setDeckTheme({ color: '#7B5EA7', glyph: '★' })
        setPose('grip')
        setCardMode(1)
        setCard(t)
      } else {
        // ...and carries it off below the table; 09 rises from here
        const t = ease((fp - 0.94) / 0.06)
        setHandTarget(mix(GRAB, HANDOFF, t), 0.12)
        setPose('grip')
        setCardMode(1)
        setCard(1) // hand + card stay IN FRAME — 09 continues from here
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
    <section className="futures-stage hand-stage" data-order="8" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>08 · Monte Carlo</span>
          </div>
          <h2 className="team-heading">
            We didn&rsquo;t test
            <br />
            one future.
          </h2>
        </motion.div>

        <motion.div className="futures-center" style={{ opacity: countOp }}>
          <motion.span className="futures-count">{count}</motion.span>
          <span className="futures-count-label">possible futures</span>
        </motion.div>

        {typeof document !== 'undefined' &&
          createPortal(
            <motion.div
              className="future-card-portal"
              style={{ opacity: cardOp }}
              ref={cardWrapRef}
            >
              <div className="future-card" ref={cardElRef}>
                <span className="future-id" ref={idRef}>
                  Future #1
                </span>
                {[0, 1, 2].map((i) => (
                  <span className="future-row" key={i} ref={(el) => (rowRefs.current[i] = el)} />
                ))}
                <div className="future-res">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      className={'future-alt' + (i === 0 ? ' first' : '')}
                      key={i}
                      ref={(el) => (altRefs.current[i] = el)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>,
            document.body,
          )}

        <motion.p className="futures-note" style={{ opacity: noteOp }}>
          In each future, all six policies face <b>exactly the same conditions</b> — common
          random numbers over nine uncertain inputs. And the exact GeNIe roll-back agrees with
          the simulated ranking: two solvers, one answer.
        </motion.p>
      </div>
    </section>
  )
}
