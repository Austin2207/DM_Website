import { useEffect, useRef, useState } from 'react'
import { motion, useTransform } from 'motion/react'

/*
 * A dealt card. Two motions, both spring-smoothed:
 *   p  — the deal: flies in from a full card-height above the hand
 *   sw — the collect: a PIXEL offset that makes the card ride along with the
 *        hand as it gathers the pile right-to-left and finally flings it off
 */
export default function DealDrop({ p, sw, children }) {
  const ref = useRef(null)
  const [h, setH] = useState(440)
  useEffect(() => {
    const m = () => ref.current && setH(ref.current.offsetHeight || 440)
    m()
    window.addEventListener('resize', m)
    return () => window.removeEventListener('resize', m)
  }, [])
  const x = useTransform([p, sw], ([pv, sv]) => (1 - pv) * -34 + sv)
  const y = useTransform(p, (v) => (1 - v) * -(h + 130))
  const rotate = useTransform([p, sw], ([pv, sv]) => (1 - pv) * -5 + Math.max(-9, sv * 0.012))
  const opacity = useTransform(p, (v) => (v <= 0.001 ? 0 : Math.min(1, v * 3)))
  return (
    <motion.div ref={ref} className="member-drop" style={{ x, y, rotate, opacity }}>
      {children}
    </motion.div>
  )
}
