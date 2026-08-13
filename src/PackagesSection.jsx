import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import DealDrop from './DealDrop.jsx'
import { LEVERS } from './LeversSection.jsx'
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

/*
 * 05 · Our alternatives — six packages, dealt like the levers.
 * Front: rank + name + score. Click: flips to that package's six switch
 * settings. Numbers must match the report to the cent.
 */
export const PACKAGES = [
  { rank: 'A1', name: 'Status quo', mean: '−$8.63B', color: '#4A6FA5', glyph: '●',
    combo: [0, 0, 0, 0, 0, 0], note: 'Congress passes nothing.' },
  { rank: 'A2', name: 'Public-health', mean: '−$4.84B', color: '#B5484D', glyph: '▲',
    combo: [1, 2, 1, 2, 2, 1], note: 'Protect people first.' },
  { rank: 'A3', name: 'Market-liberal', mean: '−$7.90B', color: '#4E7D58', glyph: '■',
    combo: [0, 1, 0, 1, 0, 0], note: 'Keep the markets open.' },
  { rank: 'A4', name: 'League-integrity', mean: '−$4.88B', color: '#C29B45', glyph: '◆',
    combo: [1, 1, 1, 1, 0, 1], note: 'Protect the games.' },
  { rank: 'A5', name: 'Balanced', mean: '−$3.74B', color: '#7B5EA7', glyph: '★',
    combo: [0, 1, 1, 1, 2, 1], note: 'Our hand — wins all 1,500 futures.', star: true },
  { rank: 'A6', name: 'Prohibition', mean: '−$18.61B', color: '#3E8E8C', glyph: '⬟',
    combo: [2, 2, 2, 2, 1, 1], note: '0 wins in any future.' },
]

const isDesktop = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

export default function PackagesSection() {
  const stageRef = useRef(null)
  const slotRefs = useRef([])
  const dealtRef = useRef(PACKAGES.map(() => false))

  const [dealt, setDealt] = useState(PACKAGES.map(() => false))
  const [flipped, setFlipped] = useState(PACKAGES.map(() => false))

  const r0 = useMotionValue(0)
  const r1 = useMotionValue(0)
  const r2 = useMotionValue(0)
  const r3 = useMotionValue(0)
  const r4 = useMotionValue(0)
  const r5 = useMotionValue(0)
  const cfg = { stiffness: 170, damping: 26 }
  const springs = [
    useSpring(r0, cfg),
    useSpring(r1, cfg),
    useSpring(r2, cfg),
    useSpring(r3, cfg),
    useSpring(r4, cfg),
    useSpring(r5, cfg),
  ]
  const raws = [r0, r1, r2, r3, r4, r5]
  const q0 = useMotionValue(0)
  const q1 = useMotionValue(0)
  const q2 = useMotionValue(0)
  const q3 = useMotionValue(0)
  const q4 = useMotionValue(0)
  const q5 = useMotionValue(0)
  const sweeps = [
    useSpring(q0, cfg),
    useSpring(q1, cfg),
    useSpring(q2, cfg),
    useSpring(q3, cfg),
    useSpring(q4, cfg),
    useSpring(q5, cfg),
  ]
  const rawsS = [q0, q1, q2, q3, q4, q5]
  const headerRaw = useMotionValue(0)
  const headerOp = useSpring(headerRaw, { stiffness: 150, damping: 28 })

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const PROG = clamp01(-stage.top / (stage.height - vh))

      /* per-card cycle: arrive -> BUFFER (30%) -> the card materializes WHILE
         the hand slides to the next spot. */
      const dealStep = (u, N) => {
        const k = Math.min(N - 1, Math.max(0, Math.floor(u)))
        const frac = clamp01(u - k)
        const t = clamp01((frac - 0.3) / 0.7)
        const moveOut = k >= N - 1 ? 0 : t
        const handT = (k + moveOut) / (N - 1)
        return { handT, pis: Array.from({ length: N }, (_, i) => (i < k ? 1 : i === k ? t : 0)) }
      }
      // deals spread further apart than 03, and an even longer all-dealt hold
      const D0 = 0.2, D1 = 0.66, H1 = 0.87, C1 = 0.98
      const u = clamp01((PROG - D0) / (D1 - D0)) * 6
      const step = dealStep(u, 6)
      const ct = clamp01((PROG - H1) / (C1 - H1))
      const flingT = clamp01((ct - 0.7) / 0.3)
      const handSweepT = ct <= 0.7 ? 1 - ct / 0.7 : -flingT * flingT * 1.8
      const pis = PROG >= D1 ? [1, 1, 1, 1, 1, 1] : step.pis
      pis.forEach((p, i) => raws[i].set(p))
      const slotRects = slotRefs.current.map((el) => el?.getBoundingClientRect())
      if (slotRects.some((r) => !r)) return
      const sl0 = slotRects[0]
      const sl5 = slotRects[5]
      const handPxX = lerp(sl0.right, sl5.right, handSweepT) + 45
      const sws = [0, 1, 2, 3, 4, 5].map((i) => {
        if (ct <= 0) return 0
        if (handSweepT > i / 5 + 0.02) return 0
        return Math.min(0, handPxX - (slotRects[i].right + 20) - i * 10)
      })
      sws.forEach((v, i) => rawsS[i].set(v))
      const flags = pis.map((p) => p >= 0.99 && PROG < H1)
      if (flags.some((f, i) => f !== dealtRef.current[i])) {
        dealtRef.current = flags
        setDealt(flags)
        setFlipped((old) => old.map((f, i) => (flags[i] ? f : false)))
      }
      headerRaw.set(Math.min(clamp01((PROG - 0.04) / 0.05), 1 - clamp01((PROG - H1) / 0.07)))

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(5)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      const HOLD = desktop
        ? { x: vw * 0.5, y: vh * 0.4, scale: 0.75, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
        : { x: vw * 0.5, y: vh * 0.36, scale: 0.55, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      const dealScale = desktop ? 0.62 : 0.45
      const dealPose = (t) => ({
        x: Math.min(lerp(sl0.right, sl5.right, t) + 45, vw - 70),
        y: lerp(sl0.bottom, sl5.bottom, t) - 35,
        scale: dealScale,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      })

      let target
      if (PROG > 0) {
        const nextIdx = Math.min(5, pis.filter((p) => p >= 0.6).length)
        setDeckTheme({ color: PACKAGES[nextIdx].color, glyph: PACKAGES[nextIdx].glyph })
        if (PROG <= 0.04) {
          target = HOLD // full deck arrived from the last table
          setPose('grip')
          setCard(1)
        } else if (PROG <= 0.09) {
          target = HOLD // the title fades in
          setPose('grip')
          setCard(1)
        } else if (PROG <= 0.15) {
          const t = ease((PROG - 0.09) / 0.06) // vertical descent first
          target = mix(HOLD, { ...dealPose(0), x: HOLD.x }, t)
          setPose('grip')
          setCard(1)
        } else if (PROG <= D0) {
          const t = ease((PROG - 0.15) / 0.05) // ...then the horizontal slide
          target = mix({ ...dealPose(0), x: HOLD.x }, dealPose(0), t)
          setPose('grip')
          setCard(1)
        } else if (PROG <= D1) {
          target = dealPose(step.handT) // dwell -> deal -> slide, card by card
          setPose('grip')
          setCard(1 - pis[5])
        } else if (PROG <= H1) {
          target = dealPose(1)
          setPose('open')
          setCard(0)
        } else if (PROG <= C1) {
          target = dealPose(handSweepT) // gather the pile, then fling it off
          setPose(ct > 0.7 ? 'open' : 'grip')
          setCard(0)
        } else {
          const t = ease((PROG - C1) / (1 - C1))
          target = mix(dealPose(-0.6), HOLD, t)
          setPose('grip')
          setCard(t)
        }
        setCardMode(1)
      } else {
        target = HOLD
        setPose('grip')
        setCardMode(1)
        setCard(1)
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

  const onFlip = (i) => {
    if (!dealt[i]) return
    setFlipped((f) => f.map((v, k) => (k === i ? !v : v)))
  }

  return (
    <section className="packages-stage hand-stage" data-order="5" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>05 · Our alternatives</span>
          </div>
          <h2 className="team-heading">
            Six philosophies,
            <br />
            six packages.
          </h2>
          <p className="team-hint">Every real bill is one of these hands. Click a card — its six switches.</p>
        </motion.div>

        <div className="levers-row">
          {PACKAGES.map((pk, i) => (
            <div key={pk.rank} className="lever-slot" ref={(el) => (slotRefs.current[i] = el)}>
              <DealDrop p={springs[i]} sw={sweeps[i]}>
                <div
                  className={'lever-card' + (flipped[i] ? ' flipped' : '') + (pk.star ? ' pk-star' : '')}
                  style={{ '--tc': pk.color }}
                  onClick={() => onFlip(i)}
                >
                  <div className="lever-inner">
                    <div className="lever-face front">
                      <span className="lever-idx">{pk.rank}</span>
                      <span className="lever-glyph">{pk.glyph}</span>
                      <span className="lever-name">{pk.name}</span>
                      <span className="pk-mean">{pk.mean}<i>/yr</i></span>
                      <span className="lever-corner">{pk.glyph}</span>
                    </div>
                    <div className="lever-face back">
                      <span className="lever-back-name">
                        {pk.rank} · {pk.name}
                      </span>
                      <div className="pk-rows">
                        {pk.combo.map((opt, k) => (
                          <span key={LEVERS[k].id} className="pk-row">
                            <i style={{ color: LEVERS[k].color }}>{LEVERS[k].glyph}</i>
                            {LEVERS[k].options[opt]}
                          </span>
                        ))}
                      </div>
                      <span className="lever-back-hint">{pk.note}</span>
                    </div>
                  </div>
                </div>
              </DealDrop>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
