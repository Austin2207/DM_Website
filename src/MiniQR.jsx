import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import QRCode from 'qrcode'
import './miniqr.css'

const EASE = [0.16, 1, 0.3, 1]

/* A small fixed QR card in the top-right corner. It appears once the
   game stage has scrolled past, so the audience can keep scanning
   while the talk continues. Scrolling back up hides it again. */
export default function MiniQR() {
  const [src, setSrc] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const url =
      new URLSearchParams(location.search).get('qrurl') ||
      location.origin + '/play.html'
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: '#0c0c0e', light: '#ffffff' },
    })
      .then(setSrc)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const check = () => {
      const gs = document.querySelector('.game-stage')
      setVisible(
        !!gs && gs.getBoundingClientRect().bottom < window.innerHeight * 0.6
      )
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  return (
    <motion.a
      className="mini-qr"
      href="/play.html"
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.85,
        y: visible ? 0 : -8,
      }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      {src && <img src={src} alt="Scan to play" />}
      <span className="mini-qr-label">Scan · play along</span>
    </motion.a>
  )
}
