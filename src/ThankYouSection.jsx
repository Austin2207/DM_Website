import { motion } from 'motion/react'

/* 14 · Curtain call — the fingertips from the scoreboard stay in view. */
export default function ThankYouSection() {
  return (
    <section className="thanks-section" id="thanks">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.6 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="team-heading">Thank you.</h2>
        <p>The Integrity Trade-Off · MS&amp;E 152 · Stanford 2026</p>
      </motion.div>
    </section>
  )
}
