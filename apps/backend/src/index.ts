// src/server.ts
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as IOServer } from 'socket.io'
import { z } from 'zod'
import { prisma } from '../prisma/index'
import { createAnonymousUser, requireAuth } from './auth'
import { runRound } from './battleEngine'

const app = express()
app.use(cors())
app.use(express.json())
const http = createServer(app)
const io = new IOServer(http, { cors: { origin: '*' } })

/** --- helpers --- */
function roomChannel(roomId: string) { return `room:${roomId}` }
function shortCode(n = 6) { return Math.random().toString(36).slice(2, 2 + n).toUpperCase() }
function ceilHalf(n: number) { return Math.ceil(n / 2) }

/** --- websockets --- */
io.on('connection', (socket) => {
  socket.on('room.join', ({ roomId }) => {
    socket.join(roomChannel(roomId))
  })
  socket.on('disconnect', () => {})
})

/** --- auth --- */
app.post('/v1/auth/anonymous', async (_req, res) => {
  const out = await createAnonymousUser()
  res.json(out)
})

/** --- create room --- */
app.post('/v1/rooms', async (req, res) => {
  try {
    const user = requireAuth(req.headers.authorization)
    const body = z.object({ bestOf: z.number().int().positive().default(3) }).parse(req.body)
    if (body.bestOf % 2 === 0) return res.status(400).json({ error: 'bestOf must be odd' }) //todo: lets change it to be unlimited and it should be determined by the engine, that - how many rounds should be played - it should never determine this actually.

    const room = await prisma.room.create({
      data: {
        inviteCode: shortCode(6),
        hostUserId: user.id,
        state: 'waiting',
        bestOf: body.bestOf, //todo: remove
      },
    })

    await prisma.roomPlayer.create({
      data: { roomId: room.id, userId: user.id, slot: 1, isReady: false },
    })

    io.to(roomChannel(room.id)).emit('room.created', { roomId: room.id, inviteCode: room.inviteCode, bestOf: room.bestOf }) //todo: remove bestOf
    res.status(201).json({ roomId: room.id, inviteCode: room.inviteCode, bestOf: room.bestOf })
  } catch (e: any) {
    res.status(401).json({ error: e.message || 'UNAUTHORIZED' })
  }
})

/** --- join room by invite code --- */
app.post('/v1/rooms/join', async (req, res) => {
  try {
    const user = requireAuth(req.headers.authorization)
    const { inviteCode } = z.object({ inviteCode: z.string().min(4) }).parse(req.body)
    const room = await prisma.room.findUnique({ where: { inviteCode } })
    if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' })
    if (['active', 'finished', 'abandoned'].includes(room.state)) return res.status(409).json({ error: 'ROOM_CLOSED' })

    const players = await prisma.roomPlayer.findMany({ where: { roomId: room.id } })
    if (players.length >= 2) return res.status(409).json({ error: 'ROOM_FULL' })

    const slot = players.find((p: { slot: number; }) => p.slot === 1) ? 2 : 1
    await prisma.roomPlayer.create({ data: { roomId: room.id, userId: user.id, slot, isReady: false } })

    // update to ready state if 2 present
    const cnt = (await prisma.roomPlayer.count({ where: { roomId: room.id } }))
    if (cnt === 2 && room.state === 'waiting') {
      await prisma.room.update({ where: { id: room.id }, data: { state: 'ready' } })
      io.to(roomChannel(room.id)).emit('room.ready', { roomId: room.id })
    }

    io.to(roomChannel(room.id)).emit('room.joined', { roomId: room.id, userId: user.id, slot })
    res.json({ roomId: room.id, slot })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

/** --- mark ready --- */
app.post('/v1/rooms/:roomId/ready', async (req, res) => {
  try {
    const user = requireAuth(req.headers.authorization)
    const { roomId } = req.params
    const rp = await prisma.roomPlayer.findFirst({ where: { roomId, userId: user.id } })
    if (!rp) return res.status(403).json({ error: 'NOT_IN_ROOM' })
    await prisma.roomPlayer.update({ where: { id: rp.id }, data: { isReady: true } })

    const all = await prisma.roomPlayer.findMany({ where: { roomId } })
    const bothReady = all.length === 2 && all.every((p: { isReady: boolean; }) => p.isReady)
    if (bothReady) {
      await prisma.room.update({ where: { id: roomId }, data: { state: 'ready' } })
      io.to(roomChannel(roomId)).emit('room.ready', { roomId })
    }
    res.json({ ok: true, bothReady })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

/** --- start battle --- */
app.post('/v1/rooms/:roomId/start', async (req, res) => {
  try {
    const user = requireAuth(req.headers.authorization)
    const { roomId } = req.params
    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' })
    const players = await prisma.roomPlayer.findMany({ where: { roomId } })
    if (players.length !== 2) return res.status(400).json({ error: 'ROOM_NOT_READY' })
    if (!players.every((p: { isReady: boolean; }) => p.isReady)) return res.status(400).json({ error: 'ROOM_NOT_READY' })
    if (room.state === 'active') return res.status(409).json({ error: 'ALREADY_STARTED' })

    const p1 = players.find((p: { slot: number; }) => p.slot === 1)!
    const p2 = players.find((p: { slot: number; }) => p.slot === 2)!
    const battle = await prisma.battle.create({
      data: { roomId, p1UserId: p1.userId, p2UserId: p2.userId, status: 'running' },
    })
    await prisma.room.update({ where: { id: roomId }, data: { state: 'active', startedAt: new Date() } })

    io.to(roomChannel(roomId)).emit('battle.started', { battleId: battle.id, bestOf: room.bestOf })

    // run rounds sequentially (simple MVP)
    let p1Score = 0, p2Score = 0
    const toWin = ceilHalf(room.bestOf)
    for (let roundNo = 1; roundNo <= room.bestOf; roundNo++) {
      const seed = `${battle.id}:${roundNo}:${Date.now()}`
      const result = runRound(seed, p1.userId, p2.userId)

      await prisma.round.create({
        data: {
          battleId: battle.id,
          roundNo,
          winnerUserId: result.winnerUserId,
          p1Outcome: result.p1,
          p2Outcome: result.p2,
        }
      })

      if (result.winnerUserId === p1.userId) p1Score++; else p2Score++;
      io.to(roomChannel(roomId)).emit('round.finished', { round: roundNo, score: { p1: p1Score, p2: p2Score }, winnerUserId: result.winnerUserId })

      if (p1Score === toWin || p2Score === toWin) break
    }

    const winnerUserId = p1Score > p2Score ? p1.userId : p2.userId
    await prisma.battle.update({
      where: { id: battle.id },
      data: { p1Score, p2Score, winnerUserId, status: 'done' }
    })
    await prisma.room.update({ where: { id: roomId }, data: { state: 'finished', endedAt: new Date() } })

    // update user stats + naive ELO delta
    const delta = 15
    if (winnerUserId === p1.userId) {
      await prisma.user.update({ where: { id: p1.userId }, data: { wins: { increment: 1 }, streak: { increment: 1 }, elo: { increment: delta } } })
      await prisma.user.update({ where: { id: p2.userId }, data: { losses: { increment: 1 }, streak: 0, elo: { decrement: delta } } as any })
    } else {
      await prisma.user.update({ where: { id: p2.userId }, data: { wins: { increment: 1 }, streak: { increment: 1 }, elo: { increment: delta } } })
      await prisma.user.update({ where: { id: p1.userId }, data: { losses: { increment: 1 }, streak: 0, elo: { decrement: delta } } as any })
    }

    io.to(roomChannel(roomId)).emit('battle.finished', { winnerUserId, finalScore: { p1: p1Score, p2: p2Score } })
    res.json({ battleId: battle.id, winnerUserId, score: { p1: p1Score, p2: p2Score } })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

/** --- get leaderboard (top N by ELO) --- */
app.get('/v1/leaderboard', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const top = await prisma.user.findMany({ orderBy: { elo: 'desc' }, take: limit, select: { id: true, handle: true, elo: true, wins: true, losses: true } })
  res.json({ entries: top })
})

const PORT = process.env.PORT || 3000
http.listen(PORT, () => console.log('Server listening on', PORT))
