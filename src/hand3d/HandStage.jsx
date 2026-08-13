import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import HandRig from './HandRig.jsx'
import { hand, cardTune, modelTune, finaleTune, futuresTune, curtainTune, thanksTune, setHandTarget, setPose, setCard, setCardMode, setDeckTheme } from './handBus.js'

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
    ...futuresTune,
    cDx: curtainTune.dx,
    cDy: curtainTune.dy,
    cScale: curtainTune.scale,
    cRotZ: curtainTune.rotZ,
    tX: thanksTune.x,
    tPeekY: thanksTune.peekY,
  })
  const [mode, setMode] = useState('float') // 'float' | 'held' | 'model'
  const live = mode === 'futures' || mode === 'curtain' || mode === 'thanks'
  useEffect(() => {
    window.__tuneLive = live
    // the section directors recompute on scroll — kick one so the mode
    // change takes effect immediately without the user having to scroll
    window.dispatchEvent(new Event('scroll'))
    return () => {
      window.__tuneLive = false
    }
  }, [live])
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const heldPose = { x: vw * 0.5, y: vh * 0.55, scale: 0.62, rotZ: 0.05, rotX: -0.12, rotY: Math.PI + 0.1 }
    const floatPose = { x: vw * 0.5, y: vh * 0.58, rotZ: v.rotZ, rotX: v.rotX, rotY: v.rotY, scale: v.scale }
    // 07 · the model — open palm peeking from the bottom edge
    const modelPose = { x: vw * v.mX, y: vh * v.mY, scale: v.mScale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
    // 12 · the finale pose — open palm with the purple A5 floating above it
    const finalePose = { x: vw * v.fX, y: vh * v.fY, scale: v.fScale, rotZ: 2.0, rotX: 1.0, rotY: 1.4 }
    if (!live) {
      setDeckTheme(mode === 'finale' ? { color: '#7B5EA7', glyph: '★' } : null)
      setHandTarget(
        mode === 'held' ? heldPose : mode === 'model' ? modelPose : mode === 'finale' ? finalePose : floatPose,
        0.15,
      )
      setPose(mode === 'held' ? 'grip' : 'flat')
      setCard(mode === 'model' ? 0 : 1)
      setCardMode(mode === 'held' ? 1 : 0)
    }
    Object.assign(cardTune, {
      floatY: v.floatY,
      floatScale: v.floatScale,
      heldY: v.heldY,
      heldScale: v.heldScale,
    })
    Object.assign(modelTune, { x: v.mX, y: v.mY, scale: v.mScale })
    Object.assign(finaleTune, { x: v.fX, y: v.fY, scale: v.fScale })
    Object.assign(futuresTune, {
      cardX: v.cardX, cardY: v.cardY, cardScale: v.cardScale,
      cardRotX: v.cardRotX, cardRotY: v.cardRotY, cardRotZ: v.cardRotZ, cardFlip: v.cardFlip,
      handDX: v.handDX, handDY: v.handDY, handScale: v.handScale,
      handRotZ: v.handRotZ, handRotX: v.handRotX, handRotY: v.handRotY, handMirror: v.handMirror,
      hcX: v.hcX, hcY: v.hcY, hcScale: v.hcScale, hcTilt: v.hcTilt,
    })
    Object.assign(curtainTune, { dx: v.cDx, dy: v.cDy, scale: v.cScale, rotZ: v.cRotZ })
    Object.assign(thanksTune, { x: v.tX, peekY: v.tPeekY })
    // LIVE modes: the page directors own the hand — poke them so every
    // slider drag applies instantly (they only run on scroll events)
    if (live) window.dispatchEvent(new Event('scroll'))
  }, [v, mode, live])
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
        <button className="tune-toggle" onClick={() => setMode('futures')} disabled={mode === 'futures'}>08</button>
        <button className="tune-toggle" onClick={() => setMode('curtain')} disabled={mode === 'curtain'}>幕布</button>
        <button className="tune-toggle" onClick={() => setMode('thanks')} disabled={mode === 'thanks'}>14手</button>
      </label>
      {(mode === 'futures' || mode === 'curtain' || mode === 'thanks') && (
        <div className="tune-live-hint">LIVE 模式:滚动到对应段落,边滑边调,页面动画照常运行</div>
      )}
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
      {mode === 'futures' && (
        <>
          {row('cardX', -350, 350, '牌 横向偏移 px', 1)}
          {row('cardY', -350, 350, '牌 纵向偏移 px', 1)}
          {row('cardScale', 0.4, 2, '牌 大小')}
          {row('cardRotX', -60, 60, '牌 X 倾斜 °', 1)}
          {row('cardRotY', -60, 60, '牌 Y 倾斜 °', 1)}
          {row('cardRotZ', -45, 45, '牌 Z 旋转 °', 1)}
          <label>
            <span>牌 翻面</span>
            <button className="tune-toggle" onClick={() => setV((s) => ({ ...s, cardFlip: s.cardFlip ? 0 : 180 }))}>
              {v.cardFlip ? '背面' : '正面'}
            </button>
          </label>
          {row('handDX', -350, 350, '手 横向偏移 px', 1)}
          {row('handDY', -100, 420, '手 纵向偏移 px', 1)}
          {row('handScale', 0.4, 1.6, '手 大小')}
          {row('handRotZ', -3.2, 3.2, '手 rotZ')}
          {row('handRotX', -1.6, 1.6, '手 rotX')}
          {row('handRotY', -0.8, 4.6, '手 rotY')}
          <label>
            <span>手 镜像</span>
            <button className="tune-toggle" onClick={() => setV((s) => ({ ...s, handMirror: s.handMirror ? 0 : 1 }))}>
              {v.handMirror ? '开' : '关'}
            </button>
          </label>
          {row('hcX', -250, 250, '手上牌 横向 px', 1)}
          {row('hcY', -250, 300, '手上牌 纵向 px', 1)}
          {row('hcScale', 0.3, 2, '手上牌 大小')}
          {row('hcTilt', -60, 60, '手上牌 倾斜 °', 1)}
        </>
      )}
      {mode === 'curtain' && (
        <>
          {row('cDx', -240, 320, '幕布手 横向偏移 px', 1)}
          {row('cDy', -240, 240, '幕布手 纵向偏移 px', 1)}
          {row('cScale', 0.3, 1.3, '幕布手 大小')}
          {row('cRotZ', -3.2, 3.2, '幕布手 旋转')}
        </>
      )}
      {mode === 'thanks' && (
        <>
          {row('tPeekY', 0.95, 1.35, '14 指尖高度 (越小越高)')}
          {row('tX', 0.6, 1.15, '谢幕手 横向 (vw) — 高度已锁定')}
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
