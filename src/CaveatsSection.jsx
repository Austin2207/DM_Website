import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import {
  hand,
  setHandTarget,
  setPose,
  setCard,
  setCardMode,
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

const ROWS = [
  {
    t: 'Scandal cost & frequency carry the case',
    d: 'r = 0.80 and 0.50 — assessed from a small sample of federal court records. The margin moves; the ranking doesn’t.',
  },
  {
    t: 'The illegal market is held fixed (≈$84B)',
    d: 'Tighter packages (A2, A4, A6) likely push more volume underground than our channel shares capture.',
  },
  {
    t: 'The rules-work multiplier rests on thin evidence',
    d: '×0.5–1.3, anchored on a few overseas evaluations (UK, Germany, Sweden) — a thin base for a parameter that scales everything.',
  },
  {
    t: 'States sit outside the frame',
    d: 'A5 is scored as if federal standards apply uniformly; state pushback could erode the modeled benefits.',
  },
]

/* the four deal beats: [arrive-start, place-start] per slot */
const BEATS = [
  [0.06, 0.16],
  [0.22, 0.28],
  [0.34, 0.4],
  [0.46, 0.52],
]

/*
 * 12 · Eyes open — same table, same rules: the hand rises from below and
 * DEALS the four watch-list cards one per beat, the finished composition
 * holds through a generous buffer, then the hand — already parked right —
 * sweeps them up RIGHT-TO-LEFT and flips straight up into 13's opening
 * pose, pile in palm. One performer; nothing rises from below.
 */
export default function CaveatsSection() {
  const stageRef = useRef(null)
  const slotRefs = useRef([])
  /* ONE CLOCK (the sections-02/03/10 pattern): every visibility target is
     computed from the RAW scroll fraction in the director — the same value
     that drives the hand — and springs only smooth the transitions. Fast
     flicks can never desynchronize the hand from the cards. */
  const cfg = { stiffness: 170, damping: 26 }
  const headerRaw = useMotionValue(0)
  const headerOp = useSpring(headerRaw, cfg)
  const c0 = useMotionValue(0)
  const c1 = useMotionValue(0)
  const c2 = useMotionValue(0)
  const c3 = useMotionValue(0)
  const cardRaws = [c0, c1, c2, c3]
  const cardOps = [useSpring(c0, cfg), useSpring(c1, cfg), useSpring(c2, cfg), useSpring(c3, cfg)]
  const chipsRaw = useMotionValue(0)
  const chipsOp = useSpring(chipsRaw, cfg)

  useEffect(() => {
    const director = () => {
      const stage = stageRef.current?.getBoundingClientRect()
      if (!stage) return
      const vh = window.innerHeight
      const active = stage.top < vh
      const tp = clamp01(-stage.top / (stage.height - vh))

      // all content targets from RAW tp, every tick — deal-in when placed,
      // sweep-out right-to-left on fixed thresholds, exact at any landing
      const outT = 1 - clamp01((tp - 0.92) / 0.08)
      headerRaw.set(Math.min(clamp01((tp - 0.02) / 0.06), outT))
      chipsRaw.set(Math.min(clamp01((tp - 0.58) / 0.06), outT))
      const sweepT = clamp01((tp - 0.84) / 0.08)
      cardRaws.forEach((mv, i) => {
        const dealt = clamp01((tp - BEATS[i][1]) / 0.05)
        const swept = sweepT >= (4 - i) / 5 ? 0 : 1
        mv.set(dealt * swept)
      })

      if (!active || hand.performing) return
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune') || q.get('rz') || q.get('rx') || q.get('ry')) return
      if (laterStageActive(11.5)) return
      const vw = window.innerWidth
      const desktop = isDesktop()

      const BELOW = { x: vw * 0.5, y: vh * 1.6, scale: desktop ? 0.75 : 0.55, rotZ: -0.05, rotX: -0.1, rotY: Math.PI + 0.2 }
      const PARK_RIGHT = {
        x: vw - 70,
        y: vh * 0.52,
        scale: desktop ? 0.55 : 0.45,
        rotZ: 0.05,
        rotX: -0.12,
        rotY: Math.PI + 0.1,
      }
      const placeAt = (i) => {
        const r = slotRefs.current[i]?.getBoundingClientRect()
        return r
          ? {
              x: Math.min(r.right + 45, vw - 70),
              y: Math.min(r.bottom - 35, vh * 0.9),
              scale: desktop ? 0.55 : 0.42,
              rotZ: 0.05,
              rotX: -0.12,
              rotY: Math.PI + 0.1,
            }
          : BELOW
      }
      const first = slotRefs.current[0]?.getBoundingClientRect()
      const last = slotRefs.current[3]?.getBoundingClientRect()

      setDeckTheme({ color: '#6b7280', glyph: '◆' })
      setPose('grip')
      setCardMode(1)

      if (tp <= 0.04) {
        setHandTarget(BELOW, 0.12) // 11 left the hand waiting below
        setCard(0)
      } else if (tp <= 0.56) {
        // deal the four watch-list cards, one per beat: arrive → buffer →
        // place (melt into the DOM card) → move on with a fresh card
        let k = 0
        for (let i = 0; i < 4; i++) if (tp >= BEATS[i][0]) k = i
        const [arrive, place] = BEATS[k]
        if (tp < place) {
          const from = k === 0 ? BELOW : placeAt(k - 1)
          const t = ease(clamp01((tp - arrive) / (place - arrive - 0.02)))
          setHandTarget(mix(from, placeAt(k), t), 0.12)
          setCard(1)
        } else {
          setHandTarget(placeAt(k), 0.12)
          setCard(1 - clamp01((tp - place) / 0.05))
        }
      } else if (tp <= 0.64) {
        // table set — the hand steps aside while the monitor chips land
        const t = ease((tp - 0.56) / 0.08)
        setHandTarget(mix(placeAt(3), PARK_RIGHT, t), 0.12)
        setCard(0)
      } else if (tp <= 0.84) {
        setHandTarget(PARK_RIGHT, 0.12) // completion buffer (extended)
        setCard(0)
      } else if (tp <= 0.92) {
        // the sweep: RIGHT → LEFT, straight from the park — no detour
        const t = clamp01((tp - 0.84) / 0.08)
        const handX = first && last ? lerp(last.right + 90, first.left - 60, t) : vw * 0.5
        setHandTarget(
          {
            x: Math.min(Math.max(handX, 70), vw - 70),
            y: first ? Math.min(first.bottom - 35, vh * 0.9) : vh * 0.6,
            scale: desktop ? 0.55 : 0.42,
            rotZ: 0.05,
            rotX: -0.12,
            rotY: Math.PI + 0.1,
          },
          0.12,
        )
        setCard(t)
      } else {
        // pile in hand, the hand FLIPS up into 13's opening pose right here —
        // one performer, no fresh hand rising from below
        const t = ease((tp - 0.92) / 0.08)
        const from = {
          x: first ? Math.max(first.left - 60, 70) : vw * 0.3,
          y: first ? Math.min(first.bottom - 35, vh * 0.9) : vh * 0.6,
          scale: desktop ? 0.55 : 0.42,
          rotZ: 0.05,
          rotX: -0.12,
          rotY: Math.PI + 0.1,
        }
        const OPEN = desktop
          ? { x: vw * finaleTune.x, y: vh * finaleTune.y, scale: finaleTune.scale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
          : { x: vw * 0.5, y: vh * 0.64, scale: 0.75, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
        setHandTarget(mix(from, OPEN, t), 0.12)
        setPose(t > 0.5 ? 'flat' : 'grip')
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
    <section className="cav-stage hand-stage" data-order="11.5" id="caveats" ref={stageRef}>
      <div className="pin-inner team-pin">
        <motion.div className="team-header" style={{ opacity: headerOp }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>12 · Eyes open</span>
          </div>
          <h2 className="team-heading">
            What we&rsquo;d
            <br />
            still watch.
          </h2>
          <p className="team-hint">
            No study changes the choice — but committing isn&rsquo;t pretending we&rsquo;re
            certain. Four inputs to keep honest.
          </p>
        </motion.div>
        <div className="cav-cards">
          {ROWS.map((r, i) => (
            <div className="cav-slot" key={r.t} ref={(el) => (slotRefs.current[i] = el)}>
              <motion.div className="cav-card" style={{ opacity: cardOps[i] }}>
                <i>{String(i + 1).padStart(2, '0')}</i>
                <h3>{r.t}</h3>
                <p>{r.d}</p>
                <em>◆</em>
              </motion.div>
            </div>
          ))}
        </div>
        <motion.div className="member-tags cav-chips" style={{ opacity: chipsOp }}>
          <span className="member-tag">monitor after passage: scandal cost · scandal rate</span>
          <span className="member-tag">rule effectiveness vs written targets</span>
          <span className="member-tag">illegal-market share by channel</span>
          <span className="member-tag">feed enforcement + treatment data back annually</span>
        </motion.div>
      </div>
    </section>
  )
}
