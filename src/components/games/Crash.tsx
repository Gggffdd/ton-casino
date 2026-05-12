import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useBalanceStore } from '../../store/balanceStore'
import { BetControls } from '../BetControls'
import { useTelegram } from '../../hooks/useTelegram'

const generateCrashPoint = (): number => {
  // House edge ~5%, crash can happen between 1.0x and 100x
  const r = Math.random()
  if (r < 0.4) return 1.0 + Math.random() * 0.5   // 40% chance crash at 1.0-1.5x
  if (r < 0.65) return 1.5 + Math.random() * 1.0   // 25% chance 1.5-2.5x
  if (r < 0.80) return 2.5 + Math.random() * 2.5   // 15% chance 2.5-5x
  if (r < 0.90) return 5 + Math.random() * 5       // 10% chance 5-10x
  if (r < 0.96) return 10 + Math.random() * 15     // 6%  chance 10-25x
  if (r < 0.99) return 25 + Math.random() * 50     // 3%  chance 25-75x
  return 75 + Math.random() * 25                   // 1%  chance 75-100x
}

type GamePhase = 'waiting' | 'running' | 'crashed'

export const Crash: React.FC = () => {
  const { bet, placeBet, addWin } = useBalanceStore()
  const { haptic } = useTelegram()
  const [phase, setPhase] = useState<GamePhase>('waiting')
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashAt, setCrashAt] = useState(0)
  const [betPlaced, setBetPlaced] = useState(false)
  const [cashedOut, setCashedOut] = useState(false)
  const [cashOutMult, setCashOutMult] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [history, setHistory] = useState<number[]>([2.34, 1.05, 8.72, 1.23, 45.1, 1.89])
  const animRef = useRef<number>()
  const startTimeRef = useRef<number>(0)
  const crashAtRef = useRef<number>(0)
  const currentBetRef = useRef<number>(0)
  const betPlacedRef = useRef(false)
  const cashedOutRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getCurrentMult = (elapsed: number): number => {
    // Exponential growth: starts slow, accelerates
    return Math.pow(Math.E, elapsed * 0.00007)
  }

  const drawGraph = useCallback((elapsed: number, crashed: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = 'rgba(42,42,58,0.8)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath()
      ctx.moveTo(0, (H / 5) * i)
      ctx.lineTo(W, (H / 5) * i)
      ctx.stroke()
    }

    // Curve
    const points: [number, number][] = []
    const steps = Math.min(elapsed / 16, 200)
    for (let i = 0; i <= steps; i++) {
      const t = i * 16
      const m = getCurrentMult(t)
      const x = (i / 200) * W
      const y = H - ((m - 1) / (crashAtRef.current - 1 + 0.001)) * H * 0.85 - H * 0.05
      points.push([x, Math.max(5, y)])
    }

    if (points.length < 2) return

    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, crashed ? '#ef4444' : '#00d4ff')
    grad.addColorStop(1, crashed ? '#dc2626' : '#7c3aed')

    ctx.strokeStyle = grad
    ctx.lineWidth = 3
    ctx.shadowColor = crashed ? '#ef4444' : '#00d4ff'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Fill under curve
    const fillGrad = ctx.createLinearGradient(0, 0, 0, H)
    fillGrad.addColorStop(0, crashed ? 'rgba(239,68,68,0.3)' : 'rgba(0,212,255,0.15)')
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fillGrad
    ctx.beginPath()
    ctx.moveTo(points[0][0], H)
    for (const [x, y] of points) ctx.lineTo(x, y)
    ctx.lineTo(points[points.length - 1][0], H)
    ctx.fill()
  }, [])

  const startRound = useCallback(() => {
    const crash = generateCrashPoint()
    crashAtRef.current = crash
    setCrashAt(crash)
    setMultiplier(1.0)
    setCashedOut(false)
    cashedOutRef.current = false
    setPhase('running')
    startTimeRef.current = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const m = getCurrentMult(elapsed)
      setMultiplier(m)
      drawGraph(elapsed, false)

      if (m >= crash) {
        // Crash!
        setMultiplier(crash)
        setPhase('crashed')
        drawGraph(elapsed, true)
        haptic('error')
        
        if (betPlacedRef.current && !cashedOutRef.current) {
          // Lost
        }
        setHistory(prev => [Math.round(crash * 100) / 100, ...prev].slice(0, 8))
        setBetPlaced(false)
        betPlacedRef.current = false

        // Next round in 3s
        setTimeout(() => {
          setPhase('waiting')
          setMultiplier(1.0)
          setCountdown(3)
          const cd = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) { clearInterval(cd); return 0 }
              return prev - 1
            })
          }, 1000)
          setTimeout(() => startRound(), 3000)
        }, 2000)
        return
      }

      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
  }, [drawGraph, haptic])

  useEffect(() => {
    const timer = setTimeout(() => startRound(), 1000)
    return () => {
      clearTimeout(timer)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const placeBetHandler = () => {
    if (phase !== 'waiting' && phase !== 'running') return
    if (betPlaced) return
    if (!placeBet(bet)) return
    currentBetRef.current = bet
    betPlacedRef.current = true
    setBetPlaced(true)
    haptic('light')
  }

  const cashOutHandler = () => {
    if (phase !== 'running' || !betPlaced || cashedOut) return
    cashedOutRef.current = true
    setCashedOut(true)
    const win = Math.floor(currentBetRef.current * multiplier)
    addWin(win)
    setCashOutMult(multiplier)
    haptic('success')
  }

  const multColor = phase === 'crashed' ? 'var(--red)' : multiplier > 2 ? 'var(--green)' : 'var(--accent)'

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.3s ease' }}>
      {/* History */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {history.map((h, i) => (
          <div key={i} style={{
            padding: '2px 8px',
            borderRadius: 6,
            background: h < 1.5 ? 'rgba(239,68,68,0.15)' : h < 3 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
            border: `1px solid ${h < 1.5 ? '#ef4444' : h < 3 ? '#f59e0b' : '#22c55e'}44`,
            color: h < 1.5 ? 'var(--red)' : h < 3 ? 'var(--accent3)' : 'var(--green)',
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {h.toFixed(2)}x
          </div>
        ))}
      </div>

      {/* Main display */}
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 12,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          width={340}
          height={180}
          style={{ width: '100%', borderRadius: 8, display: 'block' }}
        />
        
        {/* Multiplier overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {phase === 'crashed' && (
            <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 700, letterSpacing: '0.2em', marginBottom: 4 }}>
              💥 КРАШ
            </div>
          )}
          <div style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 42,
            fontWeight: 700,
            color: multColor,
            textShadow: `0 0 30px ${multColor}`,
            lineHeight: 1,
          }}>
            {multiplier.toFixed(2)}x
          </div>
          {phase === 'waiting' && countdown > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
              следующий раунд через {countdown}с
            </div>
          )}
          {cashedOut && (
            <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 700, marginTop: 4 }}>
              ✓ Забрал на {cashOutMult.toFixed(2)}x
            </div>
          )}
        </div>
      </div>

      <BetControls disabled={betPlaced || phase === 'running'} />

      <div style={{ display: 'flex', gap: 8 }}>
        {!betPlaced ? (
          <button
            onClick={placeBetHandler}
            disabled={phase === 'crashed'}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              background: phase === 'crashed' ? 'var(--bg4)' : 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: phase === 'crashed' ? 'var(--text3)' : '#000',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.05em',
              boxShadow: phase !== 'crashed' ? 'var(--glow)' : 'none',
            }}
          >
            {phase === 'waiting' ? '🎯 ПОСТАВИТЬ НА СЛЕД. РАУНД' : '🎯 ПОСТАВИТЬ'}
          </button>
        ) : (
          <button
            onClick={cashOutHandler}
            disabled={phase !== 'running' || cashedOut}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              background: cashedOut
                ? 'rgba(34,197,94,0.2)'
                : 'linear-gradient(135deg, var(--green), #15803d)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.05em',
              boxShadow: !cashedOut && phase === 'running' ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
              animation: !cashedOut && phase === 'running' ? 'pulse-glow 1s infinite' : 'none',
            }}
          >
            {cashedOut
              ? `✓ Забрал ${Math.floor(currentBetRef.current * cashOutMult)} 💎`
              : `💰 ЗАБРАТЬ ${Math.floor(currentBetRef.current * multiplier)} 💎`}
          </button>
        )}
      </div>
    </div>
  )
}
