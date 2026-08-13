import { useEffect, useRef } from 'react'
import { motion, useMotionValue } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1]
const clamp01 = (v) => Math.min(1, Math.max(0, v))

// whiteboard rule: fades only, in place
const reveal = (delay = 0) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.8, ease: EASE, delay },
})

const ROWS = [
  {
    t: 'Scandal cost & frequency carry the case',
    d: 'The two dials driving A5’s edge (r = 0.80 and r = 0.50) are assessed from a small, non-public sample of court records and league accounting. If they’re over- or under-stated, A5’s margin moves — its ranking doesn’t.',
  },
  {
    t: 'The illegal market is held fixed (≈$84B)',
    d: 'Tighter packages (A2, A4, A6) likely push more volume underground than our channel shares capture — which would understate their harm and enforcement costs.',
  },
  {
    t: 'The rules-work multiplier rests on one case',
    d: 'The ×0.5–1.3 effectiveness range is anchored on the UK card-ban lesson — a thin base for a parameter that scales every policy’s real-world effect.',
  },
  {
    t: 'States sit outside the frame',
    d: 'A5 is scored as if federal standards apply uniformly; state pushback or uneven enforcement could erode the modeled benefits in practice.',
  },
]

/*
 * 12 · Eyes open — the assumptions that need further investigation and the
 * dials to monitor (report §8), stated BEFORE the recommendation: commit
 * with clear eyes, not closed ones.
 */
export default function CaveatsSection() {
  const stageRef = useRef(null)
  const exitOp = useMotionValue(1)

  // erase-the-whiteboard exit: dissolve as the section leaves the top
  useEffect(() => {
    const onScroll = () => {
      const r = stageRef.current?.getBoundingClientRect()
      if (!r) return
      const vh = window.innerHeight
      exitOp.set(clamp01((r.bottom - vh * 0.18) / (vh * 0.3)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="dq-section" id="caveats" ref={stageRef}>
      <motion.div style={{ opacity: exitOp }}>
        <motion.div className="dq-head" {...reveal()}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>12 · Eyes open</span>
          </div>
          <h2 className="team-heading">
            What we&rsquo;d
            <br />
            still watch.
          </h2>
          <p className="dq-lead">
            No possible study changes the choice — but committing doesn&rsquo;t mean pretending
            we&rsquo;re certain. Four inputs carry more weight than their evidence base. None of
            them change the ranking (the dominance result holds); they are the dials to watch.
          </p>
        </motion.div>
        <div className="dq-rows">
          {ROWS.map((r, i) => (
            <motion.div className="dq-row" key={r.t} {...reveal(i * 0.08)}>
              <span className="dq-row-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{r.t}</h3>
                <p>{r.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div className="member-tags caveat-tags" {...reveal(0.3)}>
          <span className="member-tag">monitor after passage: scandal cost · scandal rate</span>
          <span className="member-tag">rule effectiveness vs written targets</span>
          <span className="member-tag">illegal-market share by channel</span>
          <span className="member-tag">feed enforcement + treatment data back annually</span>
        </motion.div>
      </motion.div>
    </section>
  )
}
