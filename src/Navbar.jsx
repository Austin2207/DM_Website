import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1]

function Logo() {
  return (
    <div className="logo">
      {/* the two-cards mark — same artwork as /logo.svg (the favicon) */}
      <svg width="28" height="28" viewBox="0 0 128 128" aria-hidden="true">
        <g transform="rotate(10 88 56)">
          <rect x="58" y="12" width="58" height="86" rx="10" fill="#fff" stroke="#000" strokeWidth="5" />
          <path d="M 101 24 l 6 8 l -6 8 l -6 -8 Z" fill="#000" />
        </g>
        <g transform="rotate(-8 44 74)">
          <rect x="14" y="28" width="60" height="88" rx="10" fill="#000" stroke="#fff" strokeWidth="4" />
          <path d="M 63 36 l 5.5 7 l -5.5 7 l -5.5 -7 Z" fill="#fff" />
          <path d="M 40 52 L 54 74 L 40 96 L 26 74 Z" fill="#fff" />
          <g transform="translate(49 97) rotate(-45)">
            <rect x="0" y="-3.5" width="14" height="7" fill="#fff" />
            <path d="M 14 -8 L 25 0 L 14 8 Z" fill="#fff" />
          </g>
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
