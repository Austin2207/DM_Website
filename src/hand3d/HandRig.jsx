import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { hand, cardTune, tickHand } from './handBus.js'

/*
 * Downloaded model: "Robotic Hand" by SeanNicolas (Sketchfab, CC-BY-4.0).
 * Auto-normalized (centered, scaled to HAND_H px), then rotated so its
 * axes match the rig convention: fingers +Y, back of hand +Z.
 */
export const MODEL_URL = '/model/robotic_hand/scene.gltf'
const MODEL_TUNE = { rotation: [0, -Math.PI / 2, -Math.PI / 2], height: 460 }

function ModelHand() {
  const { scene } = useGLTF(MODEL_URL)
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const k = MODEL_TUNE.height / Math.max(size.x, size.y, size.z)
    return { k, cx: -center.x, cy: -center.y, cz: -center.z }
  }, [scene])
  return (
    <group rotation={MODEL_TUNE.rotation}>
      <group scale={fit.k}>
        <primitive object={scene} position={[fit.cx, fit.cy, fit.cz]} />
      </group>
    </group>
  )
}

/*
 * Procedural matte-black bionic hand, built from rounded segments with
 * visible hinge pins. Local space: palm center at origin, fingers up (+Y),
 * sizes in px (the ortho camera maps 1 unit = 1 CSS px).
 */

const INK = '#17171a'
const INK_DARK = '#0a0a0c'
const INK_PLATE = '#24242a'

// [x offset, width, [seg lengths]]
const FINGERS = [
  [-46, 28, [56, 42, 34]], // index
  [-15, 29, [60, 46, 38]], // middle
  [16, 28, [56, 43, 35]],  // ring
  [46, 24, [44, 34, 28]],  // pinky
]
const KNUCKLE_Y = 52
const GAP = 2

// pose = { fingers: [ [mcp,pip,dip] ×4 ], lean: [z-splay ×4], thumb: [swing, curl] }
const POSES = {
  // open flat palm — the offering hand the hero card floats above
  flat: {
    fingers: [
      [0.03, 0.04, 0.03],
      [0.02, 0.03, 0.02],
      [0.03, 0.04, 0.03],
      [0.04, 0.05, 0.04],
    ],
    lean: [0.1, 0.02, -0.06, -0.15],
    thumb: [-0.22, 0.05],
  },
  hero: {
    fingers: [
      [0.03, 0.05, 0.04],
      [0.14, 0.2, 0.16],
      [0.18, 0.26, 0.2],
      [0.24, 0.32, 0.26],
    ],
    lean: [0.06, 0.01, -0.05, -0.12],
    thumb: [0.1, 0.3],
  },
  open: {
    fingers: [
      [0.1, 0.16, 0.12],
      [0.08, 0.14, 0.1],
      [0.1, 0.16, 0.12],
      [0.14, 0.2, 0.16],
    ],
    lean: [0.04, 0, -0.03, -0.06],
    thumb: [0.05, 0.15],
  },
  grip: {
    fingers: [
      [0.55, 0.78, 0.62],
      [0.52, 0.74, 0.6],
      [0.55, 0.76, 0.62],
      [0.6, 0.8, 0.66],
    ],
    lean: [0.06, 0.01, -0.04, -0.09],
    thumb: [0.32, 0.5],
  },
  point: {
    fingers: [
      [0.04, 0.06, 0.04],
      [1.05, 1.3, 1.0],
      [1.1, 1.32, 1.05],
      [1.12, 1.3, 1.0],
    ],
    lean: [0, 0.02, -0.04, -0.08],
    thumb: [0.4, 0.55],
  },
}

const seg = (w, len, d = 24) => [w, len, d]

function Hinge({ w }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[7, 7, Math.max(6, w - 6), 20]} />
      <meshStandardMaterial color={INK_DARK} roughness={0.3} metalness={0.8} />
    </mesh>
  )
}

function Segment({ w, len, d, plate = false }) {
  const depth = d ?? w + 4
  return (
    <group position={[0, len / 2, 0]}>
      <RoundedBox args={seg(w, len, depth)} radius={Math.min(w, depth) / 2 - 0.5} smoothness={6}>
        <meshStandardMaterial color={INK} roughness={0.38} metalness={0.45} />
      </RoundedBox>
      {plate && (
        <RoundedBox args={[w * 0.5, len * 0.5, 3]} radius={4} smoothness={3} position={[0, 0, depth / 2 - 0.5]}>
          <meshStandardMaterial color={INK_PLATE} roughness={0.3} metalness={0.6} />
        </RoundedBox>
      )}
    </group>
  )
}

function Finger({ x, w, lens, refs }) {
  return (
    <group position={[x, KNUCKLE_Y, 0]} ref={refs[0]}>
      <Hinge w={w} />
      <Segment w={w} len={lens[0]} plate />
      <group position={[0, lens[0] + GAP, 0]} ref={refs[1]}>
        <Hinge w={w - 2} />
        <Segment w={w - 1.5} len={lens[1]} />
        <group position={[0, lens[1] + GAP, 0]} ref={refs[2]}>
          <Hinge w={w - 4} />
          <Segment w={w - 3} len={lens[2]} d={20} />
        </group>
      </group>
    </group>
  )
}

function makeCardTexture() {
  const c = document.createElement('canvas')
  c.width = 300
  c.height = 420
  const g = c.getContext('2d')
  g.fillStyle = '#fcfcfb'
  g.fillRect(0, 0, 300, 420)
  g.strokeStyle = 'rgba(0,0,0,0.15)'
  g.lineWidth = 3
  g.strokeRect(12, 12, 276, 396)
  g.fillStyle = '#101012'
  // corner rank
  g.font = '600 34px Inter, Helvetica, Arial'
  g.fillText('A5', 28, 62)
  g.font = '26px Inter, Helvetica, Arial'
  g.fillText('♠', 32, 94)
  // center mark
  g.textAlign = 'center'
  g.font = '300 96px Inter, Helvetica, Arial'
  g.fillText('♠', 150, 246)
  // footer word
  g.font = '500 22px Inter, Helvetica, Arial'
  const word = 'BEAT OUR HAND'
  g.save()
  g.translate(150, 368)
  g.scale(0.98, 1)
  g.fillText(word.split('').join(' '), 0, 0)
  g.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  return tex
}

function makeCardBackTexture(color = '#0c0c0e', glyph = '♠') {
  const c = document.createElement('canvas')
  c.width = 300
  c.height = 420
  const g = c.getContext('2d')
  g.fillStyle = '#fcfcfb'
  g.fillRect(0, 0, 300, 420)
  // fine diagonal weave in the card's own color
  g.strokeStyle = color + '22'
  g.lineWidth = 1.5
  for (let i = -420; i < 300; i += 11) {
    g.beginPath()
    g.moveTo(i, 0)
    g.lineTo(i + 420, 420)
    g.stroke()
  }
  g.strokeStyle = color
  g.globalAlpha = 0.75
  g.lineWidth = 4
  g.strokeRect(14, 14, 272, 392)
  // center badge
  g.globalAlpha = 1
  g.fillStyle = '#fcfcfb'
  g.beginPath()
  g.arc(150, 210, 52, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = color
  g.globalAlpha = 0.75
  g.lineWidth = 3
  g.beginPath()
  g.arc(150, 210, 52, 0, Math.PI * 2)
  g.stroke()
  g.globalAlpha = 1
  g.fillStyle = color
  g.textAlign = 'center'
  g.font = '300 60px Inter, Helvetica, Arial'
  g.fillText(glyph, 150, 230)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  return tex
}

const BACK_CACHE = {}
function backTexture(color, glyph) {
  const key = color + glyph
  if (!BACK_CACHE[key]) BACK_CACHE[key] = makeCardBackTexture(color, glyph)
  return BACK_CACHE[key]
}

// scratch objects for the float <-> held card blend
const V_FLOAT = new THREE.Vector3()
const V_HELD = new THREE.Vector3()
const E_TMP = new THREE.Euler()
const Q_FLOAT = new THREE.Quaternion()
const Q_HELD = new THREE.Quaternion()

export default function HandRig({ useModel = false }) {
  const root = useRef()
  const inner = useRef()
  const cardGroup = useRef()
  const cardSpin = useRef()
  const size = useThree((s) => s.size)

  const fingerRefs = useMemo(
    () => FINGERS.map(() => [useRefLike(), useRefLike(), useRefLike()]),
    [],
  )
  const thumbSwing = useRef()
  const thumbCurl = useRef()
  const cardScale = useRef(0)
  const heldAmt = useRef(0)
  const spinAngle = useRef(0)
  const cardTex = useMemo(makeCardTexture, [])
  const cardBackTex = useMemo(() => backTexture('#0c0c0e', '♠'), [])
  const backMat = useRef()
  const themeKey = useRef('')
  const frontMat = useRef()
  const faceKey = useRef('a5')
  const qrTex = useRef(null)
  const diagramTex = useRef(null)
  const futuresTex = useRef(null)

  useFrame((state, delta) => {
    const cur = tickHand(delta)
    const t = state.clock.elapsedTime

    if (root.current) {
      // css px (top-left origin) -> world (centered, +y up)
      root.current.position.x = cur.x - size.width / 2
      root.current.position.y = size.height / 2 - cur.y
      root.current.scale.set(hand.mirror ? -cur.scale : cur.scale, cur.scale, cur.scale)
    }
    if (inner.current) {
      // idle life: gentle bob + slow 3D sway; base orientation comes from the bus.
      // ZXY order: rotZ is applied outermost (screen tilt), so poses like the
      // lying-flat hero hand compose predictably. The floating card is a sibling,
      // so it never inherits these rotations.
      // '?still' freezes everything (headless calibration); '?tune' freezes only
      // the rotation sway so angle sliders read true — the floats stay live.
      const search = typeof window !== 'undefined' ? window.location.search : ''
      const frozen = search.includes('still')
      const noSway = frozen || search.includes('tune')
      inner.current.rotation.order = 'ZXY'
      inner.current.position.y = frozen ? 0 : Math.sin(t * 0.8) * cardTune.bobHand
      inner.current.rotation.z = cur.rotZ
      inner.current.rotation.y = cur.rotY + (noSway ? 0 : Math.sin(t * 0.35) * 0.06)
      inner.current.rotation.x = cur.rotX + (noSway ? 0 : Math.sin(t * 0.5) * 0.03)
    }

    // pose blending
    const pose = POSES[hand.pose] || POSES.open
    fingerRefs.forEach((joints, i) => {
      const target = pose.fingers[i]
      joints.forEach((j, s) => {
        if (!j.current) return
        j.current.rotation.x = THREE.MathUtils.damp(j.current.rotation.x, target[s], 10, 0.016)
        if (s === 0) j.current.rotation.z = THREE.MathUtils.damp(j.current.rotation.z, pose.lean[i], 10, 0.016)
      })
    })
    if (thumbSwing.current)
      thumbSwing.current.rotation.z = THREE.MathUtils.damp(thumbSwing.current.rotation.z, 0.55 + pose.thumb[0], 10, 0.016)
    if (thumbCurl.current)
      thumbCurl.current.rotation.x = THREE.MathUtils.damp(thumbCurl.current.rotation.x, pose.thumb[1], 10, 0.016)

    // hero card: floats & spins above the palm; as cardMode -> 1 it is gripped
    // face-down in the hand (same 3D scene, so the hand physically covers it)
    cardScale.current = THREE.MathUtils.damp(cardScale.current, hand.card, 8, 0.016)
    heldAmt.current = THREE.MathUtils.damp(heldAmt.current, hand.cardMode, 10, 0.016)
    const m = heldAmt.current
    if (hand.cardSpin) {
      spinAngle.current += 0.016 * 0.9 * (1 - m) // spin dies out as the hand closes
    } else {
      // QR mode: settle flat, facing the camera
      const tgt = Math.round(spinAngle.current / (Math.PI * 2)) * Math.PI * 2
      spinAngle.current = THREE.MathUtils.damp(spinAngle.current, tgt, 6, 0.016)
    }
    if (cardGroup.current && inner.current) {
      const ov = hand.cardOverride
      const sizeMul =
        THREE.MathUtils.lerp(cardTune.floatScale, cardTune.heldScale, m) * (ov ? ov.scale : 1)
      cardGroup.current.scale.setScalar(Math.max(0.0001, cardScale.current * sizeMul))
      cardGroup.current.visible = cardScale.current > 0.02
      // the card rides the hand's idle bob so their spacing never drifts
      const bobY = inner.current.position.y
      V_FLOAT.set(
        -20 + (ov ? ov.dx : 0),
        cardTune.floatY + (ov ? ov.dy : 0) + bobY + Math.sin(t * 1.15) * 8 * (1 - m),
        140,
      )
      // held deck: bottom in the palm, top well past the fingertips
      V_HELD.set(ov ? ov.dx : 0, cardTune.heldY + (ov ? ov.dy : 0), 40).applyQuaternion(inner.current.quaternion)
      V_HELD.y += bobY
      cardGroup.current.position.lerpVectors(V_FLOAT, V_HELD, m)
      // arc the blend: the straight float<->held line passes through the
      // finger geometry, so mid-transition the card lifts and swings toward
      // the camera, traveling OVER the hand instead of through it
      const arc = Math.sin(Math.PI * m)
      cardGroup.current.position.y += arc * cardTune.arcLift
      cardGroup.current.position.z += arc * cardTune.arcPush
      Q_FLOAT.setFromEuler(
        E_TMP.set(0, spinAngle.current, Math.sin(spinAngle.current) * 0.05 + (ov ? ov.tilt : 0)),
      )
      Q_HELD.copy(inner.current.quaternion)
      cardGroup.current.quaternion.slerpQuaternions(Q_FLOAT, Q_HELD, m)
    }
    if (cardSpin.current) {
      cardSpin.current.rotation.set(0, 0, 0)
    }
    // the card front swaps between the A5 face, the game QR code, and the
    // influence-diagram thumbnail (section 07's opening card)
    if (frontMat.current) {
      const want =
        hand.cardFace === 'qr' && hand.qrUrl
          ? 'qr'
          : hand.cardFace === 'diagram'
            ? 'diagram'
            : hand.cardFace === 'futures'
              ? 'futures'
              : 'a5'
      if (want !== faceKey.current) {
        faceKey.current = want
        if (want === 'qr') {
          if (!qrTex.current) {
            const img = new Image()
            const tx = new THREE.Texture(img)
            img.onload = () => { tx.needsUpdate = true }
            img.src = hand.qrUrl
            tx.anisotropy = 4
            qrTex.current = tx
          }
          frontMat.current.map = qrTex.current
        } else if (want === 'futures') {
          if (!futuresTex.current) {
            // a sampled-future card face: one draw, all six alternatives
            const c = document.createElement('canvas')
            c.width = 512
            c.height = 716
            const g = c.getContext('2d')
            g.fillStyle = '#ffffff'
            g.fillRect(0, 0, c.width, c.height)
            g.strokeStyle = 'rgba(0,0,0,0.22)'
            g.lineWidth = 6
            g.strokeRect(14, 14, c.width - 28, c.height - 28)
            g.fillStyle = 'rgba(0,0,0,0.45)'
            g.font = '600 26px Inter, sans-serif'
            g.textAlign = 'left'
            g.fillText('FUTURE #316', 48, 88)
            g.strokeStyle = 'rgba(0,0,0,0.14)'
            g.lineWidth = 2
            g.beginPath(); g.moveTo(48, 112); g.lineTo(464, 112); g.stroke()
            g.fillStyle = '#111'
            g.font = '500 30px Inter, sans-serif'
            const rows = ['High addiction', 'Base effectiveness', 'Costly federal cases']
            rows.forEach((t, i) => g.fillText(t, 48, 172 + i * 56))
            g.beginPath(); g.moveTo(48, 356); g.lineTo(464, 356); g.stroke()
            const alts = [
              ['A5  −$4.6B · 1st', '#7B5EA7', '700'],
              ['A2  −$5.4B', 'rgba(0,0,0,0.55)', '500'],
              ['A4  −$5.5B', 'rgba(0,0,0,0.55)', '500'],
              ['A3  −$7.9B', 'rgba(0,0,0,0.55)', '500'],
              ['A1  −$10.2B', 'rgba(0,0,0,0.55)', '500'],
              ['A6  −$17.8B', 'rgba(0,0,0,0.55)', '500'],
            ]
            alts.forEach(([t, col, w], i) => {
              g.fillStyle = col
              g.font = w + ' 27px Inter, sans-serif'
              g.fillText(t, 48, 410 + i * 46)
            })
            const tx = new THREE.CanvasTexture(c)
            tx.anisotropy = 4
            futuresTex.current = tx
          }
          frontMat.current.map = futuresTex.current
        } else if (want === 'diagram') {
          if (!diagramTex.current) {
            // draw the landscape diagram onto a portrait card face
            const c = document.createElement('canvas')
            c.width = 512
            c.height = 716
            const g = c.getContext('2d')
            g.fillStyle = '#ffffff'
            g.fillRect(0, 0, c.width, c.height)
            g.strokeStyle = 'rgba(0,0,0,0.22)'
            g.lineWidth = 6
            g.strokeRect(14, 14, c.width - 28, c.height - 28)
            const tx = new THREE.CanvasTexture(c)
            tx.anisotropy = 4
            const img = new Image()
            img.onload = () => {
              const w = c.width - 56
              const h = (img.height / img.width) * w
              g.drawImage(img, 28, (c.height - h) / 2, w, h)
              tx.needsUpdate = true
            }
            img.src = '/diagram.png'
            diagramTex.current = tx
          }
          frontMat.current.map = diagramTex.current
        } else {
          frontMat.current.map = cardTex
        }
        frontMat.current.needsUpdate = true
      }
    }
    // the deck's back swaps to the NEXT card's design as each card is dealt
    if (backMat.current) {
      const th = hand.deckTheme
      const key = th ? th.color + th.glyph : '#0c0c0e♠'
      if (key !== themeKey.current) {
        themeKey.current = key
        backMat.current.map = th ? backTexture(th.color, th.glyph) : backTexture('#0c0c0e', '♠')
        backMat.current.needsUpdate = true
      }
    }
  })

  return (
    <group ref={root}>
      <group ref={inner}>
        {useModel && <ModelHand />}
        {!useModel && (
          <>
        {/* palm */}
        <RoundedBox args={[128, 122, 42]} radius={20} smoothness={6} position={[0, -6, 0]}>
          <meshStandardMaterial color={INK} roughness={0.42} metalness={0.4} />
        </RoundedBox>
        <RoundedBox args={[90, 64, 6]} radius={10} smoothness={3} position={[0, -14, 22]}>
          <meshStandardMaterial color={INK_PLATE} roughness={0.3} metalness={0.6} />
        </RoundedBox>
        {/* knuckle ridge, integrated into the palm silhouette */}
        <RoundedBox args={[124, 26, 38]} radius={13} smoothness={5} position={[0, 48, 0]}>
          <meshStandardMaterial color={INK} roughness={0.38} metalness={0.5} />
        </RoundedBox>

        {/* fingers */}
        {FINGERS.map((f, i) => (
          <Finger key={i} x={f[0]} w={f[1]} lens={f[2]} refs={fingerRefs[i]} />
        ))}

        {/* thumb */}
        <group position={[-62, -16, 10]} ref={thumbSwing} rotation={[0, 0, 0.55]}>
          <Hinge w={28} />
          <Segment w={28} len={64} />
          <group position={[0, 64 + GAP, 0]} ref={thumbCurl}>
            <Hinge w={24} />
            <Segment w={24} len={48} />
          </group>
        </group>

        {/* wrist + forearm running out of frame */}
        <RoundedBox args={[88, 26, 40]} radius={12} smoothness={5} position={[0, -76, 0]}>
          <meshStandardMaterial color={INK_DARK} roughness={0.3} metalness={0.7} />
        </RoundedBox>
        <RoundedBox args={[80, 260, 38]} radius={18} smoothness={5} position={[3, -212, 0]} rotation={[0, 0, -0.04]}>
          <meshStandardMaterial color={INK} roughness={0.46} metalness={0.35} />
        </RoundedBox>
          </>
        )}
      </group>

      {/* hero card: floats above the palm in screen space (sibling of the hand,
          so it stays upright while the hand flips over on scroll) */}
      <group ref={cardGroup} position={[0, 150, 140]}>
        <group ref={cardSpin}>
          <RoundedBox args={[150, 210, 3]} radius={9} smoothness={4}>
            <meshStandardMaterial color="#fafafa" roughness={0.6} metalness={0.02} />
          </RoundedBox>
          <mesh position={[0, 0, 2.2]}>
            <planeGeometry args={[144, 204]} />
            <meshBasicMaterial ref={frontMat} map={cardTex} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -2.2]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[144, 204]} />
            <meshBasicMaterial ref={backMat} map={cardBackTex} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// stable ref objects created once per mount (avoids hooks-in-loop lint issues)
function useRefLike() {
  return { current: null }
}
