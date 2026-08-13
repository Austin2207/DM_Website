import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/*
 * Pinned intro stage = hero + 01 · The problem, one continuous scrub:
 *   - hero copy fades out IN PLACE (the page is pinned, nothing slides away)
 *   - the card materializes above the hand (hand never moves or resizes)
 *   - problem copy fades in on BOTH sides of the hand
 *   - at the end of the pin the card vanishes again (the hand travels to the
 *     team table empty, and the deck re-appears there — TeamSection's director)
 */
export default function IntroSection() {
  const stageRef = useRef(null)
  const raw = useMotionValue(0)
  const p = useSpring(raw, { stiffness: 140, damping: 27 })

  useEffect(() => {
    const on = () => {
      const r = stageRef.current?.getBoundingClientRect()
      if (!r) return
      raw.set(clamp01(-r.top / (r.height - window.innerHeight)))
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // copy is fully in by 0.53; [0.53, 0.78] = the ONE long buffer at full
  // display; the exit (shrink + fade + hand rising) runs [0.78, 1.0] straight
  // through to the pin release — no pause after the hand lifts the card
  const out = (v) => 1 - clamp01((v - 0.78) / 0.16)
  const heroOp = useTransform(p, (v) => 1 - clamp01((v - 0.12) / 0.18))
  const lOp = useTransform(p, (v) => clamp01((v - 0.3) / 0.15) * out(v))
  const lY = useTransform(p, (v) => (1 - clamp01((v - 0.3) / 0.15)) * 40)
  const rOp = useTransform(p, (v) => clamp01((v - 0.38) / 0.15) * out(v))
  const rY = useTransform(p, (v) => (1 - clamp01((v - 0.38) / 0.15)) * 40)
  const qOp = useTransform(p, (v) => clamp01((v - 0.5) / 0.1) * out(v))

  return (
    <section className="intro-stage" ref={stageRef}>
      <div className="pin-inner">
        {/* hero copy — fades out where it stands */}
        <motion.div className="intro-hero" style={{ opacity: heroOp }}>
          <div className="footer">
            <div className="footer-left">
              <div className="subtitle">
                <span className="subtitle-dot" />
                <span>The Integrity Trade-Off · MS&amp;E 152 Decision Analysis</span>
              </div>
              <h1 className="heading">
                America Bets. Congress
                <br />
                Holds the Cards.
              </h1>
              <div className="cta-row">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => {
                    const el = stageRef.current
                    if (!el) return
                    const top = el.getBoundingClientRect().top + window.scrollY
                    window.scrollTo({
                      top: top + (el.offsetHeight - window.innerHeight) * 0.5,
                      behavior: 'smooth',
                    })
                  }}
                >
                  See the Problem
                </button>
                <a className="btn-secondary" href="https://beatourhand.vercel.app/" target="_blank" rel="noreferrer">
                  Play Our Game
                </a>
              </div>
            </div>
            <div className="footer-right">
              <span className="tag-pill">Six levers</span>
              <span className="tag-pill">1,500 futures</span>
              <span className="tag-pill">One recommendation</span>
            </div>
          </div>
        </motion.div>

        {/* 01 · the problem — value on one side, harm on the other */}
        <motion.div className="intro-prob left" style={{ opacity: lOp, y: lY }}>
          <div className="subtitle">
            <span className="subtitle-dot" />
            <span>01 · The problem</span>
          </div>
          <h2>
            Sports betting
            <br />
            creates value.
          </h2>
          <div className="member-tags">
            <span className="member-tag">$166.9B legal handle · 2025</span>
            <span className="member-tag">Tax revenue</span>
            <span className="member-tag">Entertainment</span>
            <span className="member-tag">A legal, monitored market</span>
          </div>
        </motion.div>

        <motion.div className="intro-prob right" style={{ opacity: rOp, y: rY }}>
          <h2>
            But it also
            <br />
            creates harm.
          </h2>
          <div className="member-tags">
            <span className="member-tag">Addiction</span>
            <span className="member-tag">≈$84B illegal market</span>
            <span className="member-tag">Match fixing · 34 indicted, NBA 2025</span>
          </div>
        </motion.div>

        {/* the question of the whole talk — lands after both sides are in */}
        <motion.div className="intro-question" style={{ opacity: qOp }}>
          So how should Congress regulate sports gambling to create the highest overall
          social value?
        </motion.div>
      </div>
    </section>
  )
}
