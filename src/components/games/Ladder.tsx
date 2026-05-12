import React, { useState, useCallback } from 'react'
import { useBalanceStore } from '../../store/balanceStore'
import { BetControls } from '../BetControls'
import { useTelegram } from '../../hooks/useTelegram'

const STEPS = [
  { label: '1', mult: 1.05, chance: 95 },
  { label: '2', mult: 1.15, chance: 90 },
  { label: '3', mult: 1.3, chance: 85 },
  { label: '4', mult: 1.5, chance: 80 },
  { label: '5', mult: 1.8, chance: 75 },
  { label: '6', mult: 2.2, chance: 70 },
  { label: '7', mult: 2.8, chance: 65 },
  { label: '8', mult: 3.5, chance: 60 },
  { label: '9', mult: 4.5, chance: 55 },
  { label: '10', mult: 6.0, chance: 50 },
  { label: '15', mult: 10.0, chance: 42 },
  { label: '20', mult: 18.0, chance: 34 },
  { label: '30', mult: 35.0, chance: 25 },
  { label: '50', mult: 65.0, chance: 16 },
  { label: '100', mult: 100.0, chance: 8 },
]

export const Ladder: React.FC = () => {
  const { bet, placeBet, addWin } = useBalanceStore()
  const { haptic } = useTelegram()
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [result, setResult] = useState<'win' | 'loss' | null>(null)
  const [winAmount, setWinAmount] = useState(0)

  const play = useCallback(() => {
    if (selectedStep === null) return
    if (!placeBet(bet)) return

    setPlaying(true)
    setResult(null)
    haptic('medium')

    setTimeout(() => {
      const step = STEPS[selectedStep]
      const roll = Math.random() * 100
      const win = roll < step.chance

      if (win) {
        const earned = Math.floor(bet * step.mult)
        addWin(earned)
        setWinAmount(earned)
        setResult('win')
        haptic('success')
      } else {
        setWinAmount(bet)
        setResult('loss')
        haptic('error')
      }
      setPlaying(false)
    }, 1200)
  }, [selectedStep, bet, placeBet, addWin, haptic])

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', letterSpacing: '0.1em' }}>
        ВЫБЕРИ СТУПЕНЬ — ЧЕМ ВЫШЕ, ТЕМ РИСКОВАННЕЕ
      </div>

      {/* Ladder grid */}
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 340,
        overflowY: 'auto',
      }}>
        {[...STEPS].reverse().map((step, revIdx) => {
          const idx = STEPS.length - 1 - revIdx
          const selected = selectedStep === idx
          const gradientPos = idx / (STEPS.length - 1)
          const stepColor = `hsl(${120 - gradientPos * 120}, 80%, 55%)`

          return (
            <button
              key={idx}
              onClick={() => !playing && setSelectedStep(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
                background: selected ? `${stepColor}22` : 'var(--bg4)',
                border: `1px solid ${selected ? stepColor : 'var(--border)'}`,
                color: selected ? stepColor : 'var(--text2)',
                cursor: playing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: selected ? `0 0 12px ${stepColor}44` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{idx === STEPS.length - 1 ? '🏆' : idx > 9 ? '⬆️' : '🪜'}</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.05em' }}>
                    x{step.mult.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>
                    шанс {step.chance}%
                  </span>
                </div>
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 13,
                fontWeight: 700,
                color: stepColor,
                opacity: 0.9,
              }}>
                {step.label}x
              </div>
            </button>
          )
        })}
      </div>

      {/* Potential win */}
      {selectedStep !== null && (
        <div style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>Потенциальный выигрыш</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--gold)', fontSize: 16 }}>
            💎 {Math.floor(bet * STEPS[selectedStep].mult)}
          </span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          padding: '12px',
          borderRadius: 10,
          background: result === 'win' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${result === 'win' ? 'var(--green)' : 'var(--red)'}`,
          textAlign: 'center',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ fontSize: 22 }}>{result === 'win' ? '🎉' : '💀'}</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: result === 'win' ? 'var(--green)' : 'var(--red)' }}>
            {result === 'win' ? `+${winAmount}` : `-${winAmount}`} 💎
          </div>
        </div>
      )}

      <BetControls disabled={playing} />

      <button
        onClick={play}
        disabled={playing || selectedStep === null}
        style={{
          padding: '14px',
          borderRadius: 10,
          background: playing || selectedStep === null
            ? 'var(--bg4)'
            : 'linear-gradient(135deg, var(--accent), var(--accent2))',
          color: playing || selectedStep === null ? 'var(--text3)' : '#000',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '0.1em',
          boxShadow: playing || selectedStep === null ? 'none' : 'var(--glow)',
          transition: 'all 0.2s',
        }}
      >
        {playing ? '⏳ ПОДЪЁМ...' : selectedStep === null ? 'ВЫБЕРИ СТУПЕНЬ' : '🪜 ПОДНЯТЬСЯ'}
      </button>
    </div>
  )
}
