/*
 * Imperative channel between DOM choreography (scroll, card clicks)
 * and the R3F hand rig. The rig reads `hand` every frame; DOM code
 * sets tween targets. All coordinates are CSS pixels (top-left origin).
 */

// live-tunable card parameters (the ?tune panel writes these)
// locked by Austin via the tuner, 2026-08-12
export const cardTune = {
  floatY: 160, // float height above the palm
  floatScale: 0.9, // card size while floating
  heldY: 235, // deck height in the gripped hand
  heldScale: 1.3, // card size while held
  bobHand: 10, // hand idle float amplitude (px)
}

// the 12 finale hand (fractions of vw/vh) — tunable via ?tune (12手);
// how much of the hand stays in frame at the end of the recommendation
export const finaleTune = {
  x: 0.62,
  y: 0.62,
  scale: 1.15,
}

// the 07 model-section hand (fractions of vw/vh) — locked by Austin via the
// tuner, 2026-08-12: x 0.55 · y 0.85 · scale 1.10
export const modelTune = {
  x: 0.55,
  y: 0.85,
  scale: 1.1,
}

export const hand = {
  cur: { x: 0, y: -600, scale: 1, rotZ: 2.0, rotY: 1.4, rotX: 1.0 },
  target: null, // damped-follow target (velocity-continuous, restart-proof)
  rate: 12, // damp rate — derived from the dur passed to setHandTarget
  pose: 'flat',
  card: 1, // hero card presence 0..1 (rig damps toward this)
  cardMode: 0, // 0 = floating & spinning above the palm, 1 = gripped face-down in the hand
  deckTheme: null, // {color, glyph} of the NEXT card being dealt (null = classic spade)
  cardFace: 'deck', // 'deck' = A5 playing card, 'qr' = the game QR code
  cardSpin: true, // false = card settles facing the camera (QR mode)
  qrUrl: null, // dataURL for the QR texture
  performing: false, // true while a scripted sequence owns the hand
}

/*
 * Exponential damped follow instead of restartable tweens: fast scrolling
 * fires large target jumps at arbitrary event rates, and restarting an eased
 * tween on every event makes the hand's velocity discontinuous (the "flash"
 * stutter). Damping chases the target continuously — any jump becomes a
 * single smooth glide, whatever the scroll speed.
 */
export function setHandTarget(to, dur = 0.6) {
  if (!hand.target) hand.target = { ...hand.cur }
  Object.assign(hand.target, to)
  // dur keeps its old meaning of "response time"
  hand.rate = Math.min(16, Math.max(4, 6 / Math.max(0.05, dur)))
  if (dur <= 0.02) Object.assign(hand.cur, to) // instant placement
}

/** Called by the rig each frame: damps cur toward target, returns cur. */
export function tickHand(dt) {
  if (!hand.target) return hand.cur
  const k = 1 - Math.exp(-hand.rate * Math.min(dt, 0.05))
  for (const key of Object.keys(hand.target)) {
    hand.cur[key] += (hand.target[key] - hand.cur[key]) * k
  }
  return hand.cur
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function setPose(p) {
  hand.pose = p
}
export function setCard(v) {
  hand.card = v
}
export function setCardMode(v) {
  hand.cardMode = v
}
export function setDeckTheme(t) {
  hand.deckTheme = t
}
export function setCardFace(f) {
  hand.cardFace = f
}
export function setCardSpin(v) {
  hand.cardSpin = v
}
export function setQrUrl(u) {
  hand.qrUrl = u
}
/** true if any pinned hand-stage with a higher order has reached the viewport */
export function laterStageActive(order) {
  if (typeof document === 'undefined') return false
  const vh = window.innerHeight
  return Array.from(document.querySelectorAll('.hand-stage')).some(
    (el) => +el.dataset.order > order && el.getBoundingClientRect().top < vh,
  )
}
export function setPerforming(v) {
  hand.performing = v
}

export async function moveHand(to, dur, pose) {
  if (pose) hand.pose = pose
  setHandTarget(to, dur)
  await sleep(dur * 1000)
}
