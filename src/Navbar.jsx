import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1]

function Logo() {
  return (
    <div className="logo">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <g transform="rotate(-35 14 14)">
          <rect x="6" y="5" width="7" height="18" rx="3.5" fill="#000" />
          <rect x="15" y="5" width="7" height="18" rx="3.5" fill="#000" />
        </g>
      </svg>
      <span className="brand">The Integrity Trade-Off</span>
    </div>
  )
}

export default function Navbar() {
  return (
    <motion.nav
      className="nav"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div className="nav-left">
        <Logo />
      </div>
      <div className="nav-right">
        <span className="nav-plain-label">Stanford MS&amp;E 152 · Group 6 · 2026</span>
      </div>
    </motion.nav>
  )
}
