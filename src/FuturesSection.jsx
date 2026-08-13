import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
  laterStageActive,
} from './hand3d/handBus.js'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

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
  const idRef = useRef(null)
  const rowRefs = useRef([])
  const altRefs = useRef([])

  // generous landing at 1,500 [0.58–0.9], then dissolve right at the pin end
  // so 09 begins with no blank scroll
  const out = (v) => 1 - clamp01((v - 0.9) / 0.08)
  const headerOp = useTransform(p, (v) => clamp01((v - 0.02) / 0.06) * out(v))
  const countOp = useTransform(p, (v) => clamp01((v - 0.08) / 0.06) * out(v))
  const count = useTransform(p, (v) =>
    Math.floor(clamp01((v - 0.12) / 0.46) * 1500).toLocaleString('en-US'),
  )
  const noteOp = useTransform(p, (v) => clamp01((v - 0.5) / 0.08) * out(v))
  const cardOp = useTransform(p, (v) => clamp01((v - 0.13) / 0.05) * out(v))

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const fp = clamp01(-stage.top / (stage.height - vh))
      raw.set(fp)

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

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(8)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      // the hand sits this one out, parked below the frame
      const BELOW = desktop
        ? { x: vw * 0.5, y: vh * 1.6, scale: 0.75, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
        : { x: vw * 0.5, y: vh * 1.6, scale: 0.55, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      setHandTarget(BELOW, 0.12)
      setPose('grip')
      setCardMode(1)
      setCard(0)
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

        <motion.div className="future-card-wrap" style={{ opacity: cardOp }}>
          <div className="future-card">
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
        </motion.div>

        <motion.p className="futures-note" style={{ opacity: noteOp }}>
          In each future, all six policies face <b>exactly the same conditions</b> — common
          random numbers over nine uncertain inputs. And the exact GeNIe roll-back agrees with
          the simulated ranking: two solvers, one answer.
        </motion.p>
      </div>
    </section>
  )
}
