import React, { useState, useCallback } from 'react'
import { useBalanceStore } from '../../store/balanceStore'
import { BetControls } from '../BetControls'
import { useTelegram } from '../../hooks/useTelegram'

type Side = 'heads' | 'tails'

export const Coinflip: React.FC = () => {
  const { bet, placeBet, addWin } = useBalanceStore()
  const { haptic } = useTelegram()
  const [selected, setSelected] = useState<Side | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState<Side | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isWin, setIsWin] = useState(false)
  const [streak, setStreak] = useState(0)
  const [history, setHistory] = useState<Side[]>([])

  const flip = useCallback(() => {
    if (!selected || flipping) return
    if (!placeBet(bet)) return

    setFlipping(true)
    setShowResult(false)
    haptic('medium')

    setTimeout(() => {
      const outcome: Side = Math.random() < 0.5 ? 'heads' : 'tails'
      setResult(outcome)
      const win = outcome === selected

      if (win) {
        addWin(bet * 2)
        setStreak(prev => prev + 1)
        haptic('success')
      } else {
        setStreak(0)
        haptic('error')
      }
      setIsWin(win)
      setShowResult(true)
      setFlipping(false)
      setHistory(prev => [outcome, ...prev].slice(0, 10))
    }, 1500)
  }, [selected, flipping, bet, placeBet, addWin, haptic])

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      {/* Streak */}
      {streak > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '6px',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid var(--accent3)',
          borderRadius: 8,
          color: 'var(--accent3)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.1em',
          animation: 'slideUp 0.3s ease',
        }}>
          🔥 СЕРИЯ: {streak} ПОБЕД
        </div>
      )}

      {/* Coin */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
        <div style={{
          width: 140, height: 140,
          borderRadius: '50%',
          position: 'relative',
          animation: flipping ? 'spin 0.15s linear infinite' : showResult ? 'bounce-in 0.4s ease' : 'float 3s ease-in-out infinite',
        }}>
          {/* Coin face */}
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: result === 'tails' && showResult
              ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8, #a0a0a0)'
              : 'linear-gradient(135deg, #ffd700, #ffec6e, #b8860b)',
            boxShadow: showResult && isWin
              ? '0 0 40px rgba(255,215,0,0.8), 0 4px 20px rgba(0,0,0,0.5)'
              : '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            border: '4px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s',
          }}>
            {!flipping && (
              <>
                <div style={{ fontSize: 50, lineHeight: 1 }}>
                  {showResult
                    ? result === 'heads' ? '👑' : '🌕'
                    : selected === 'heads' ? '👑' : selected === 'tails' ? '🌕' : '🪙'}
                </div>
                {showResult && (
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: result === 'heads' ? '#7c3aed' : '#374151',
                    letterSpacing: '0.1em',
                    marginTop: 4,
                  }}>
                    {result === 'heads' ? 'ОРЁЛ' : 'РЕШКА'}
                  </div>
                )}
              </>
            )}
            {flipping && (
              <div style={{ fontSize: 40 }}>🪙</div>
            )}
          </div>
        </div>
      </div>

      {/* Result message */}
      {showResult && (
        <div style={{
          padding: '12px',
          borderRadius: 10,
          background: isWin ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${isWin ? 'var(--green)' : 'var(--red)'}`,
          textAlign: 'center',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: isWin ? 'var(--green)' : 'var(--red)' }}>
            {isWin ? `🎉 +${bet * 2} 💎` : `💀 -${bet} 💎`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {isWin ? 'Правильно!' : `Выпало ${result === 'heads' ? 'ОРЁЛ' : 'РЕШКА'}`}
          </div>
        </div>
      )}

      {/* Choice buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        {(['heads', 'tails'] as Side[]).map(side => (
          <button
            key={side}
            onClick={() => !flipping && setSelected(side)}
            style={{
              flex: 1,
              padding: '16px 8px',
              borderRadius: 12,
              background: selected === side
                ? side === 'heads'
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.1))'
                  : 'linear-gradient(135deg, rgba(107,114,128,0.3), rgba(107,114,128,0.1))'
                : 'var(--bg3)',
              border: `2px solid ${selected === side
                ? side === 'heads' ? 'var(--accent2)' : '#6b7280'
                : 'var(--border)'}`,
              color: selected === side ? 'var(--text)' : 'var(--text2)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.1em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: selected === side
                ? side === 'heads' ? '0 0 16px rgba(124,58,237,0.3)' : '0 0 16px rgba(107,114,128,0.2)'
                : 'none',
            }}
          >
            <span style={{ fontSize: 32 }}>{side === 'heads' ? '👑' : '🌕'}</span>
            <span>{side === 'heads' ? 'ОРЁЛ' : 'РЕШКА'}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>x2.0</span>
          </button>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          {history.map((h, i) => (
            <div key={i} style={{
              width: 28, height: 28,
              borderRadius: '50%',
              background: h === 'heads' ? '#7c3aed33' : '#6b728033',
              border: `1px solid ${h === 'heads' ? '#7c3aed' : '#6b7280'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>
              {h === 'heads' ? '👑' : '🌕'}
            </div>
          ))}
        </div>
      )}

      <BetControls disabled={flipping} />

      <button
        onClick={flip}
        disabled={flipping || !selected}
        style={{
          padding: '14px',
          borderRadius: 10,
          background: flipping || !selected
            ? 'var(--bg4)'
            : 'linear-gradient(135deg, var(--accent), var(--accent2))',
          color: flipping || !selected ? 'var(--text3)' : '#000',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '0.1em',
          boxShadow: flipping || !selected ? 'none' : 'var(--glow)',
          transition: 'all 0.2s',
        }}
      >
        {flipping ? '🪙 БРОСАЮ...' : !selected ? 'ВЫБЕРИ СТОРОНУ' : '🪙 БРОСИТЬ'}
      </button>
    </div>
  )
}
