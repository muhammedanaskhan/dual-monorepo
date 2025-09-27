// src/engine.ts
import crypto from 'crypto'

export type RoundResult = {
  winnerUserId: string
  p1: any
  p2: any
}

function rng(seed: string): () => number {
  // simple deterministic RNG from seed
  let ctr = 0
  return () => {
    const h = crypto.createHash('sha256').update(seed + ':' + (ctr++)).digest()
    return (h.readUInt32BE(0) >>> 0) / 0xffffffff
  }
}

/** Returns winner + outcomes. Extend this with real logic later. */
export function runRound(seed: string, p1UserId: string, p2UserId: string): RoundResult {
  const R = rng(seed)
  const p1Damage = Math.floor(R() * 100)
  const p2Damage = Math.floor(R() * 100)
  const winnerUserId = p1Damage >= p2Damage ? p1UserId : p2UserId
  return {
    winnerUserId,
    p1: { damage: p1Damage },
    p2: { damage: p2Damage },
  }
}
