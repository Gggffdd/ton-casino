import React, { useState, useCallback } from 'react'
import { useBalanceStore } from '../../store/balanceStore'
import { BetControls } from '../BetControls'
import { ResultPopup } from '../ResultPopup'
import { useTelegram } from '../../hooks/useTelegram'

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
const getColor = (n: number) => n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black'

type BetType = 'red' | 'black' | 'green' | number

const WHEEL_NUMBERS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,
  24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
]

export const Roulette: React.FC = () => {
  const { bet, placeBet, addWin } = useBalanceStore()
  const { haptic } = useTelegram()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [isWin, setIsWin] = useState(false)

  const spin = useCallback(() => {
    if (spinning || !selectedBet) return
    if (!placeBet(bet)) return

    setSpinning(true)
    setShowResult(false)
    haptic('medium')

    const resultNum = Math.floor(Math.random() * 37)
    const wheelIdx = WHEEL_NUMBERS.indexOf(resultNum)
    const segAngle = 360 / 37
    const targetAngle = 360 * 8 + wheelIdx * segAngle + segAngle / 2
    setWheelAngle(prev => prev + targetAngle)

    setTimeout(() => {
      setResult(resultNum)
      const color = getColor(resultNum)
      let win = false
      let mult = 0

      if (selectedBet === 'red' && color === 'red') { win = true; mult = 2 }
      else if (selectedBet === 'black' && color === 'black') { win = true; mult = 2 }
      else if (selectedBet === 'green' && color === 'green') { win = true; mult = 14 }
      else if (typeof selectedBet === 'number' && selectedBet === resultNum) { win = true; mult = 36 }

      if (win) {
        addWin(bet * mult)
        setLastWin(bet * mult)
        haptic('success')
      } else {
        setLastWin(bet)
        haptic('error')
      }
      setIsWin(win)
      setShowResult(true)
      setSpinning(false)

      setTimeout(() => setShowResult(false), 2000)
    }, 4000)
  }, [spinning, selectedBet, bet, placeBet, addWin, haptic])

  const colorBg = (c: 'red' | 'black' | 'green') => ({
    red: '#dc2626', black: '#1a1a2e', green: '#16a34a'
  }[c])

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      {/* Wheel visual */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', width: 240, height: 240 }}>
          {/* Wheel SVG */}
          <svg
            viewBox="0 0 240 240"
            style={{
              width: '100%', height: '100%',
              transform: `rotate(${wheelAngle}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 1)' : 'none',
            }}
          >
            {WHEEL_NUMBERS.map((num, i) => {
              const angle = (i / 37) * 360
              const rad = (angle * Math.PI) / 180
              const color = getColor(num)
              const segAngle = 360 / 37
              const startRad = ((angle - segAngle / 2) * Math.PI) / 180
              const endRad = ((angle + segAngle / 2) * Math.PI) / 180
              const r = 110, cx = 120, cy = 120
              const x1 = cx + r * Math.sin(startRad)
              const y1 = cy - r * Math.cos(startRad)
              const x2 = cx + r * Math.sin(endRad)
              const y2 = cy - r * Math.cos(endRad)
              const textR = 90
              const tx = cx + textR * Math.sin(rad)
              const ty = cy - textR * Math.cos(rad)
              return (
                <g key={i}>
                  <path
                    d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                    fill={color === 'red' ? '#dc2626' : color === 'green' ? '#16a34a' : '#111'}
                    stroke="#1a1a2e"
                    strokeWidth="1"
                  />
                  <text
                    x={tx} y={ty}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="7" fontWeight="bold"
                    transform={`rotate(${angle}, ${tx}, ${ty})`}
                  >
                    {num}
                  </text>
                </g>
              )
            })}
            <circle cx="120" cy="120" r="25" fill="#0a0a0f" stroke="#2a2a3a" strokeWidth="2" />
            <circle cx="120" cy="120" r="18" fill="linear-gradient(135deg, #ffd700, #b8860b)" />
            <text x="120" y="120" textAnchor="middle" dominantBaseline="middle" fill="#ffd700" fontSize="14" fontWeight="bold">🎰</text>
          </svg>
          {/* Pointer */}
          <div style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '20px solid var(--accent)',
            filter: 'drop-shadow(0 0 8px var(--accent))',
            zIndex: 2,
          }} />
        </div>

        {result !== null && !spinning && (
          <div style={{
            position: 'absolute',
            bottom: 0, right: 0,
            background: `${colorBg(getColor(result) as any)}cc`,
            border: `2px solid ${getColor(result) === 'red' ? '#dc2626' : getColor(result) === 'green' ? '#16a34a' : '#444'}`,
            borderRadius: 12,
            padding: '6px 14px',
            fontFamily: 'JetBrains Mono',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
          }}>
            {result}
          </div>
        )}
      </div>

      {/* Color bets */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['red', 'black', 'green'] as const).map(c => (
          <button
            key={c}
            onClick={() => setSelectedBet(c)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 10,
              background: selectedBet === c
                ? colorBg(c)
                : 'var(--bg3)',
              border: `2px solid ${selectedBet === c ? colorBg(c)! : 'var(--border)'}`,
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: spinning ? 0.5 : 1,
              transition: 'all 0.15s',
              boxShadow: selectedBet === c ? `0 0 16px ${colorBg(c)}88` : 'none',
            }}
          >
            {c === 'red' ? '🔴' : c === 'black' ? '⚫' : '🟢'} {c}
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
              {c === 'green' ? 'x14' : 'x2'}
            </div>
          </button>
        ))}
      </div>

      {/* Number grid */}
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 10,
        maxHeight: 160,
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.1em' }}>
          ЧИСЛА (x36)
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: 4,
        }}>
          {Array.from({ length: 37 }, (_, i) => i).map(n => {
            const c = getColor(n)
            const sel = selectedBet === n
            return (
              <button
                key={n}
                onClick={() => setSelectedBet(n)}
                disabled={spinning}
                style={{
                  padding: '4px 2px',
                  borderRadius: 6,
                  background: sel ? (c === 'red' ? '#dc2626' : c === 'green' ? '#16a34a' : '#555') : 'var(--bg4)',
                  border: `1px solid ${sel ? '#fff4' : 'var(--border)'}`,
                  color: n === 0 ? '#4ade80' : RED_NUMBERS.has(n) ? '#fca5a5' : '#d1d5db',
                  fontSize: 11,
                  fontWeight: sel ? 700 : 500,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>

      <BetControls disabled={spinning} />

      <button
        onClick={spin}
        disabled={spinning || !selectedBet}
        style={{
          padding: '14px',
          borderRadius: 12,
          background: spinning || !selectedBet
            ? 'var(--bg4)'
            : 'linear-gradient(135deg, var(--accent), var(--accent2))',
          color: spinning || !selectedBet ? 'var(--text3)' : '#000',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '0.1em',
          boxShadow: spinning || !selectedBet ? 'none' : 'var(--glow)',
          transition: 'all 0.2s',
        }}
      >
        {spinning ? '🎡 ВРАЩАЮ...' : !selectedBet ? 'ВЫБЕРИ СТАВКУ' : '🎰 КРУТИТЬ'}
      </button>

      <ResultPopup show={showResult} win={isWin} amount={lastWin}
        message={result !== null ? `Выпало: ${result} (${getColor(result)})` : undefined} />
    </div>
  )
}
