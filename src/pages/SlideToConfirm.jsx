// Slide to confirm: drag the knob all the way right.
// variant 'bold' — dark CRED-style pill (Cart: slide to pay)
// variant 'soft' — blends with cards (cook: slide when ready)
// Built on @use-gesture/react (drag) + @react-spring/web (springy motion).
import { useEffect, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { animated, useSpring } from '@react-spring/web'
import { CheckOutline } from 'antd-mobile-icons'
import { SpinLoading } from 'antd-mobile'

const THRESHOLD = 0.85
const TICKS = [0.25, 0.5, 0.75]
const stop = (e) => e.stopPropagation()
const buzz = (ms) => { try { navigator.vibrate?.(ms) } catch { /* not supported */ } }

export default function SlideToConfirm({
  label, releaseLabel, doneLabel = 'Done', onConfirm, onDone, disabled = false,
  size = 'large', tone = 'turmeric', variant = 'bold',
}) {
  const track = useRef(null)
  const ticked = useRef(new Set())
  const [max, setMax] = useState(0)
  const [state, setState] = useState('idle') // idle | busy | done
  const [armed, setArmed] = useState(false)   // past the confirm point while dragging
  const [grabbed, setGrabbed] = useState(false)
  const knob = size === 'large' ? 56 : 44
  const [{ x }, api] = useSpring(() => ({ x: 0, config: { tension: 380, friction: 30 } }))

  useEffect(() => {
    const measure = () => track.current && setMax(track.current.offsetWidth - knob - 8)
    measure(); window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [knob])

  const finish = async () => {
    setState('busy'); setArmed(false)
    api.start({ x: max, config: { tension: 500, friction: 26 } })
    buzz([12, 40, 24])
    try {
      await onConfirm?.(); setState('done')
      // let the ✓ + ripple play before the caller swaps this slider out
      if (onDone) setTimeout(onDone, 1300)
    } catch { setState('idle'); api.start({ x: 0 }) }
  }

  const bind = useDrag(({ down, movement: [mx], first, cancel }) => {
    if (disabled || state !== 'idle') return cancel?.()
    if (first) { ticked.current = new Set(); setGrabbed(true) }
    // Rubber band past the end: the knob gives a little, then resists.
    const raw = Math.max(0, mx)
    const pos = raw <= max ? raw : max + Math.min(14, (raw - max) * 0.2)
    const p = max ? Math.min(1, raw / max) : 0
    if (down) {
      TICKS.forEach((t) => { if (p >= t && !ticked.current.has(t)) { ticked.current.add(t); buzz(6) } })
      setArmed(p >= THRESHOLD)
      return api.start({ x: pos, immediate: true })
    }
    setGrabbed(false); setArmed(false)
    if (p >= THRESHOLD) finish()
    else api.start({ x: 0, config: { tension: 300, friction: 22 } })
  }, { axis: 'x', filterTaps: true })   // pointer events: works for finger, mouse and pen

  const progress = x.to((v) => (max ? Math.min(1, v / max) : 0))
  const shown = armed && releaseLabel ? releaseLabel : label
  return (
    <div
      ref={track}
      className={`slide-confirm ${variant} ${size} tone-${tone} ${disabled ? 'disabled' : ''} ${state} ${armed ? 'armed' : ''}`}
      onTouchStart={stop} onPointerDown={stop} onMouseDown={stop}
      role="slider" aria-label={label} aria-valuemin={0} aria-valuemax={100}
    >
      <animated.div className="slide-fill" style={{ width: x.to((v) => v + knob + 4) }} />
      <animated.span className="slide-label" style={{ opacity: progress.to((p) => (state !== 'idle' ? 0 : armed ? 1 : 1 - p * 1.3)) }}>
        {shown}
      </animated.span>
      {state === 'done' && <span className="slide-done">{doneLabel}</span>}
      {state === 'done' && <span className="slide-ripple" />}
      <animated.div {...bind()} className={`slide-knob ${grabbed ? 'grabbed' : ''}`} style={{ x, width: knob, height: knob }}>
        {state === 'busy' ? <SpinLoading color="currentColor" style={{ '--size': '20px' }} />
          : state === 'done' ? <CheckOutline className="slide-check" fontSize={22} />
          : <span className="slide-chevrons">{variant === 'soft' ? '›' : '›››'}</span>}
      </animated.div>
    </div>
  )
}
