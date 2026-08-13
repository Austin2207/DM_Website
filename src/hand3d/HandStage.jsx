import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import HandRig from './HandRig.jsx'
import { hand, cardTune, modelTune, finaleTune, setHandTarget, setPose, setCard, setCardMode, setDeckTheme } from './handBus.js'

/* Perspective camera positioned so the z=0 plane maps 1 world unit = 1 CSS px.
   Real perspective is what makes the lying-flat hero hand read with depth. */
function PxCamera() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    const fov = 32
    camera.fov = fov
    camera.position.set(0, 0, size.height / (2 * Math.tan((fov * Math.PI) / 360)))
    camera.near = 50
    camera.far = camera.position.z * 4
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

/*
 * Fixed full-viewport 3D layer that hosts THE hand — one hand for the
 * whole site. Hero: open flat palm, card spinning above it. Scrolling
 * down flips the hand over while the card vanishes; scripted sequences
 * (dealing, pulling cards) take over via hand.performing.
 *
 * Model swap: drop a glTF at website/public/model/robotic-hand.glb and
 * the rig renders it instead of the procedural hand (tune MODEL_TUNE
 * in HandRig once the file exists).
 */

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function ScrollDirector() {
  useEffect(() => {
    const apply = () => {
      if (hand.performing) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const desktop = vw >= 768
      const p = easeInOut(clamp01(window.scrollY / (vh * 0.9)))

      // dev calibration override: /?rz=2.0&rx=0.85&ry=0.45[&nocard][&still]
      const q = new URLSearchParams(window.location.search)
      if (q.has('tune')) return // the slider panel owns the hand
      const ovZ = parseFloat(q.get('rz'))
      const ovX = parseFloat(q.get('rx'))
      const ovY = parseFloat(q.get('ry'))
      if (!Number.isNaN(ovZ) || !Number.isNaN(ovX) || !Number.isNaN(ovY)) {
        setHandTarget(
          {
            x: vw * 0.53,
            y: vh * 0.58,
            scale: 1.15,
            rotZ: Number.isNaN(ovZ) ? 2.0 : ovZ,
            rotX: Number.isNaN(ovX) ? 0.85 : ovX,
            rotY: Number.isNaN(ovY) ? 0.45 : ovY,
          },
          0.05,
        )
        setPose('flat')
        setCard(q.has('nocard') ? 0 : 1)
        return
      }

      // the scroll-scrubbed timeline itself lives in TeamSection (it owns the
      // slot geometry); this director only serves the dev overrides above.
      void vw
      void vh
      void desktop
      void p
    }
    apply()
    window.addEventListener('scroll', apply, { passive: true })
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])
  return null
}

/* On-screen sliders for Austin: open the site with ?tune and drag.
   Send the three numbers back to lock them in as the official pose. */
function TunePanel() {
  const [v, setV] = useState({
    rotZ: 2.0,
    rotX: 1.0,
    rotY: 1.4,
    scale: 1.5,
    floatY: cardTune.floatY,
    floatScale: cardTune.floatScale,
    heldY: cardTune.heldY,
    heldScale: cardTune.heldScale,
    mX: modelTune.x,
    mY: modelTune.y,
    mScale: modelTune.scale,
    fX: finaleTune.x,
    fY: finaleTune.y,
    fScale: finaleTune.scale,
  })
  const [mode, setMode] = useState('float') // 'float' | 'held' | 'model'
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const heldPose = { x: vw * 0.5, y: vh * 0.55, scale: 0.62, rotZ: 0.05, rotX: -0.12, rotY: Math.PI + 0.1 }
    const floatPose = { x: vw * 0.5, y: vh * 0.58, rotZ: v.rotZ, rotX: v.rotX, rotY: v.rotY, scale: v.scale }
    // 07 · the model — open palm peeking from the bottom edge
    const modelPose = { x: vw * v.mX, y: vh * v.mY, scale: v.mScale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
    // 12 · the finale pose — open palm with the purple A5 floating above it
    const finalePose = { x: vw * v.fX, y: vh * v.fY, scale: v.fScale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
    setDeckTheme(mode === 'finale' ? { color: '#7B5EA7', glyph: '★' } : null)
    setHandTarget(
      mode === 'held' ? heldPose : mode === 'model' ? modelPose : mode === 'finale' ? finalePose : floatPose,
      0.15,
    )
    setPose(mode === 'held' ? 'grip' : 'flat')
    setCard(mode === 'model' ? 0 : 1)
    setCardMode(mode === 'held' ? 1 : 0)
    Object.assign(cardTune, {
      floatY: v.floatY,
      floatScale: v.floatScale,
      heldY: v.heldY,
      heldScale: v.heldScale,
    })
    Object.assign(modelTune, { x: v.mX, y: v.mY, scale: v.mScale })
    Object.assign(finaleTune, { x: v.fX, y: v.fY, scale: v.fScale })
  }, [v, mode])
  const row = (k, min, max, label, step = 0.01) => (
    <label key={k}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v[k]}
        onChange={(e) => setV((s) => ({ ...s, [k]: +e.target.value }))}
      />
      <b>{Number(v[k]).toFixed(step >= 1 ? 0 : 2)}</b>
    </label>
  )
  return (
    <div className="tune-panel">
      <div className="tune-title">TUNER — 调到满意后把数字发给 Claude</div>
      <label>
        <span>预览状态</span>
        <button className="tune-toggle" onClick={() => setMode('float')} disabled={mode === 'float'}>悬浮</button>
        <button className="tune-toggle" onClick={() => setMode('held')} disabled={mode === 'held'}>手持牌组</button>
        <button className="tune-toggle" onClick={() => setMode('model')} disabled={mode === 'model'}>07模型</button>
        <button className="tune-toggle" onClick={() => setMode('finale')} disabled={mode === 'finale'}>12手</button>
      </label>
      {mode === 'float' && (
        <>
          {row('rotZ', 0, 3.2, '手 rotZ 平面旋转')}
          {row('rotX', -0.6, 1.6, '手 rotX 俯视角')}
          {row('rotY', -0.8, 1.6, '手 rotY 侧转')}
          {row('scale', 0.5, 1.8, '手 scale 大小')}
          {row('floatY', 80, 340, '牌悬浮高度', 1)}
          {row('floatScale', 0.4, 1.5, '牌大小(悬浮)')}
        </>
      )}
      {mode === 'held' && (
        <>
          {row('heldY', 60, 260, '牌手持高度', 1)}
          {row('heldScale', 0.5, 1.5, '牌大小(手持)')}
        </>
      )}
      {mode === 'model' && (
        <>
          {row('mX', 0.2, 0.8, '07 手横向位置 (vw)')}
          {row('mY', 0.6, 1.5, '07 手纵向位置 (vh)')}
          {row('mScale', 0.5, 1.8, '07 手大小')}
        </>
      )}
      {mode === 'finale' && (
        <>
          {row('fX', 0.3, 0.85, '12 手横向位置 (vw)')}
          {row('fY', 0.3, 1.0, '12 手纵向位置 (vh)')}
          {row('fScale', 0.6, 1.6, '12 手大小')}
        </>
      )}
    </div>
  )
}

export default function HandStage() {
  const [hasModel, setHasModel] = useState(false)
  const tune =
    typeof window !== 'undefined' && window.location.search.includes('tune')

  useEffect(() => {
    fetch('/model/robotic_hand/scene.gltf', { method: 'HEAD' })
      .then((r) => {
        const type = r.headers.get('content-type') || ''
        if (r.ok && !type.includes('text/html')) setHasModel(true)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      {tune && <TunePanel />}
      <div className="hand3d-layer" aria-hidden="true">
      <ScrollDirector />
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <PxCamera />
        <ambientLight intensity={0.5} />
        <directionalLight position={[-500, 600, 700]} intensity={2.3} />
        <directionalLight position={[600, 0, 300]} intensity={0.45} color="#dfe6ff" />
        <directionalLight position={[200, 500, -600]} intensity={1.7} color="#ffffff" />
        <directionalLight position={[0, -500, 400]} intensity={0.35} color="#fff6e8" />
        <Suspense fallback={null}>
          <HandRig useModel={hasModel} />
        </Suspense>
      </Canvas>
      </div>
    </>
  )
}
