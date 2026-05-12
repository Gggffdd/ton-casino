import React, { useState, useCallback } from 'react'
import { useBalanceStore } from '../../store/balanceStore'
import { BetControls } from '../BetControls'
import { useTelegram } from '../../hooks/useTelegram'

const GRID_SIZE = 25
const MINE_COUNT = 5

type CellState = 'hidden' | 'safe' | 'mine'

const generateMines = (): Set<number> => {
  const mines = new Set<number>()
  while (mines.size < MINE_COUNT) {
    mines.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return mines
}

const getMultiplier = (found: number): number => {
  // Progressive multiplier: more gems = higher reward
  const mults = [1, 1.2, 1.5, 1.9, 2.5, 3.2, 4.2, 5.5, 7.2, 9.5, 12.5, 16.8, 22.5, 30, 40, 55, 75, 100]
  return mults[Math.min(found, mults.length - 1)]
}

export const Miner: React.FC = () => {
  const { bet, placeBet, addWin, balance } = useBalanceStore()
  const { haptic } = useTelegram()
  const [gameActive, setGameActive] = useState(false)
  const [mines, setMines] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Map<number, CellState>>(new Map())
  const [gemCount, setGemCount] = useState(0)
  const [exploded, setExploded] = useState(false)
  const [cashedOut, setCashedOut] = useState(false)
  const [winAmount, setWinAmount] = useState(0)

  const startGame = useCallback(() => {
    if (!placeBet(bet)) return
    const newMines = generateMines()
    setMines(newMines)
    setRevealed(new Map())
    setGemCount(0)
    setExploded(false)
    setCashedOut(false)
    setGameActive(true)
    setWinAmount(0)
    haptic('medium')
  }, [bet, placeBet, haptic])

  const revealCell = useCallback((idx: number) => {
    if (!gameActive || revealed.has(idx)) return
    
    const isMine = mines.has(idx)
    const newRevealed = new Map(revealed)
    newRevealed.set(idx, isMine ? 'mine' : 'safe')
    setRevealed(newRevealed)

    if (isMine) {
      // Reveal all mines
      mines.forEach(m => newRevealed.set(m, 'mine'))
      setRevealed(newRevealed)
      setExploded(true)
      setGameActive(false)
      haptic('error')
    } else {
      const newCount = gemCount + 1
      setGemCount(newCount)
      haptic('light')
      
      // Auto cashout if all safe cells found
      const safeCells = GRID_SIZE - MINE_COUNT
      if (newCount >= safeCells) {
        const win = Math.floor(bet * getMultiplier(newCount))
        addWin(win)
        setWinAmount(win)
        setGameActive(false)
        setCashedOut(true)
        haptic('success')
      }
    }
  }, [gameActive, revealed, mines, gemCount, bet, addWin, haptic])

  const cashOut = useCallback(() => {
    if (!gameActive || gemCount === 0) return
    const win = Math.floor(bet * getMultiplier(gemCount))
    addWin(win)
    setWinAmount(win)
    setGameActive(false)
    setCashedOut(true)
    haptic('success')
    
    // Reveal all mines
    const newRevealed = new Map(revealed)
    mines.forEach(m => newRevealed.set(m, 'mine'))
    setRevealed(newRevealed)
  }, [gameActive, gemCount, bet, addWin, haptic, revealed, mines])

  const mult = getMultiplier(gemCount)
  const potentialWin = Math.floor(bet * mult)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatBox label="GEMS" value={`${gemCount}`} icon="💎" />
        <StatBox label="MINES" value={`${MINE_COUNT}`} icon="💣" color="var(--red)" />
        <StatBox label="МНОЖИТЕЛЬ" value={`x${mult.toFixed(1)}`} icon="⚡" color="var(--accent3)" />
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 6,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 12,
      }}>
        {Array.from({ length: GRID_SIZE }, (_, i) => {
          const state = revealed.get(i)
          const isHidden = !state
          const isSafe = state === 'safe'
          const isMine = state === 'mine'

          return (
            <button
              key={i}
              onClick={() => revealCell(i)}
              disabled={!gameActive || !isHidden}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                border: `1px solid ${isMine ? 'var(--red)' : isSafe ? 'var(--green)' : 'var(--border)'}`,
                background: isMine
                  ? 'rgba(239,68,68,0.2)'
                  : isSafe
                  ? 'rgba(34,197,94,0.15)'
                  : gameActive
                  ? 'var(--bg4)'
                  : 'var(--bg)',
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: isSafe ? '0 0 10px rgba(34,197,94,0.3)' : isMine ? '0 0 10px rgba(239,68,68,0.3)' : 'none',
                transform: gameActive && isHidden ? 'scale(1)' : 'scale(0.98)',
                animation: isSafe ? 'bounce-in 0.3s ease' : isMine ? 'shake 0.3s ease' : 'none',
                cursor: gameActive && isHidden ? 'pointer' : 'default',
              }}
            >
              {isSafe ? '💎' : isMine ? '💣' : isHidden && gameActive ? '' : ''}
            </button>
          )
        })}
      </div>

      {/* Result message */}
      {(exploded || cashedOut) && (
        <div style={{
          padding: '12px',
          borderRadius: 10,
          background: exploded ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${exploded ? 'var(--red)' : 'var(--green)'}`,
          textAlign: 'center',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ fontSize: 24 }}>{exploded ? '💥 ВЗРЫВ!' : '🎉 ВЫИГРЫШ!'}</div>
          {cashedOut && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
              +{winAmount} 💎
            </div>
          )}
        </div>
      )}

      <BetControls disabled={gameActive} />

      <div style={{ display: 'flex', gap: 8 }}>
        {gameActive && gemCount > 0 && (
          <button
            onClick={cashOut}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--green), #15803d)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.05em',
              boxShadow: '0 0 20px rgba(34,197,94,0.4)',
            }}
          >
            💰 ЗАБРАТЬ {potentialWin} 💎
          </button>
        )}
        {!gameActive && (
          <button
            onClick={startGame}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: '#000',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '0.1em',
              boxShadow: 'var(--glow)',
            }}
          >
            💣 НАЧАТЬ ИГРУ
          </button>
        )}
      </div>
    </div>
  )
}

const StatBox: React.FC<{ label: string; value: string; icon: string; color?: string }> = ({ label, value, icon, color }) => (
  <div style={{
    flex: 1,
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '8px 10px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--text)' }}>
      {icon} {value}
    </div>
  </div>
)
