import { motion } from 'motion/react'
import { Plus } from 'lucide-react'

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

function DotsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="3.5" cy="3.5" r="1.6" fill="#fff" />
      <circle cx="8.5" cy="3.5" r="1.6" fill="#fff" />
      <circle cx="3.5" cy="8.5" r="1.6" fill="#fff" />
      <circle cx="8.5" cy="8.5" r="1.6" fill="#fff" />
    </svg>
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
        <button className="menu-btn" type="button">
          <span className="menu-btn-circle">
            <Plus size={12} strokeWidth={3} color="#000" />
          </span>
          <span className="menu-btn-label">Menu</span>
        </button>
        <div className="nav-tags">
          <span>Sports Gambling</span>
          <span>Decision Analysis</span>
        </div>
      </div>
      <div className="nav-right">
        <div className="nav-right-pill">
          <button className="nav-right-circle" type="button" aria-label="Stanford MS&E 152">
            <DotsIcon />
          </button>
          <span className="nav-right-label">Stanford MS&amp;E 152 · 2026</span>
        </div>
      </div>
    </motion.nav>
  )
}
