import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/index'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export type AuthUser = { id: string; handle: string }

export async function createAnonymousUser(): Promise<{ token: string; user: AuthUser }> {
  const handle = `player-${Math.random().toString(36).slice(2, 7)}`
  const user = await prisma.user.create({ data: { handle } })
  const token = jwt.sign({ sub: user.id, handle: user.handle }, JWT_SECRET, { expiresIn: '30d' })
  return { token, user: { id: user.id, handle: user.handle } }
}

export function requireAuth(bearer?: string): AuthUser {
  if (!bearer) throw new Error('UNAUTHORIZED')
  const token = bearer.replace(/^Bearer\s+/i, '')
  const payload = jwt.verify(token, JWT_SECRET) as any
  return { id: payload.sub, handle: payload.handle }
}
