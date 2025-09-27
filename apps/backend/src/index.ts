// src/server.ts
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as IOServer } from 'socket.io'
import { z } from 'zod'
import { prisma } from '../prisma/index'
import { runRound } from './battleEngine'
import { requireAuth } from './utils/verification'

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
  console.log('User connected:', socket.id)
  
  socket.on('room.join', ({ roomId }) => {
    socket.join(roomChannel(roomId))
    console.log(`User ${socket.id} joined room ${roomId}`)
  })
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    // TODO: Handle disconnection during matches
  })
  
  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })
})

/** --- auth --- */
app.post('/v1/auth/anonymous', async (_req, res) => {
  const user = await requireAuth(_req.headers.authorization);

  console.log('user', user)

  const existing = await prisma.user.findUnique({ where: { privyId: user.id } })
  console.log('existing', existing)
  if (!existing) {
    await prisma.user.create({ data: { privyId: user.id } })
    res.json({ msg: "User created" })
    return
  }
  res.json({ msg: "User already exists" })
})


app.post('/v1/auth/cards', async (req, res) => {
  const user = await requireAuth(req.headers.authorization)
  const cards = await prisma.user.findUnique({ where: { privyId: user.id } })

  if (cards?.cardIds.length === 0) {
    //todo: select any random 5 cards from the 20 cards which we have [zaid].
    const cards = await prisma.card.findMany({ take: 5 })
    await prisma.user.update({ where: { privyId: user.id }, data: { cardIds: cards.map(card => card.id) } })
    res.json(cards)
    return
  }

  const promiseCardsArray = cards?.cardIds.map(async (cardId: string) => {
    const promise = prisma.card.findUnique({ where: { id: cardId } })
    return promise
  });

  const cardsArray = await Promise.all(promiseCardsArray || [])
  res.json(cardsArray)
})

app.get('/v1/rooms', async (req, res) => {
  const rooms = await prisma.room.findMany({})
  res.json(rooms)
})

/** --- create room --- */

app.post('/v1/find-room', async (req, res) => {
  try {
    const user = await requireAuth(req.headers.authorization)
    const rooms = await prisma.room.findMany({})

    // 1) Try to join any waiting room with <2 players
    for (const r of rooms) {
      if (r.state !== 'waiting') continue

      const count = await prisma.roomPlayer.count({ where: { roomId: r.id } })
      if (count >= 2) continue

      // choose slot based on what's taken
      const players = await prisma.roomPlayer.findMany({ where: { roomId: r.id } })
      const slot = players.find((p: { slot: number }) => p.slot === 1) ? 2 : 1

      await prisma.roomPlayer.create({
        data: { roomId: r.id, userId: user.id, slot }
      })

      await prisma.room.update({ where: { id: r.id }, data: { state: 'ready' } })

      io.to(roomChannel(r.id)).emit('room.joined', { roomId: r.id, userId: user.id, slot })
      io.to(roomChannel(r.id)).emit('room.ready', { roomId: r.id })

      return res.status(201).json({
        roomId: r.id,
        inviteCode: r.inviteCode,
        msg: 'ROOM_JOINED'
      })
    }

    // 2) Otherwise create a fresh waiting room for this user
    const created = await prisma.room.create({
      data: {
        inviteCode: shortCode(6),
        hostUserId: user.id,
        state: 'waiting',
      },
    })

    await prisma.roomPlayer.create({
      data: { roomId: created.id, userId: user.id, slot: 1 },
    })

    await prisma.room.update({ where: { id: created.id }, data: { state: 'ready' } })

    io.to(roomChannel(created.id)).emit('room.created', { roomId: created.id, inviteCode: created.inviteCode })
    io.to(roomChannel(created.id)).emit('room.joined', { roomId: created.id, userId: user.id, slot: 1 })
    io.to(roomChannel(created.id)).emit('room.ready', { roomId: created.id })


    return res.status(201).json({
      roomId: created.id,
      inviteCode: created.inviteCode,
      msg: 'ROOM_CREATED'
    })
  } catch (e: any) {
    return res.status(401).json({ error: e.message || 'UNAUTHORIZED' })
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
    // if (!players.every((p: { isReady: boolean; }) => p.isReady)) return res.status(400).json({ error: 'ROOM_NOT_READY' })
    if (room.state === 'active') return res.status(409).json({ error: 'ALREADY_STARTED' })

    const p1 = players.find((p: { slot: number; }) => p.slot === 1)!
    const p2 = players.find((p: { slot: number; }) => p.slot === 2)!
    const battle = await prisma.battle.create({
      data: { roomId, p1UserId: p1.userId, p2UserId: p2.userId, status: 'running' },
    })
    await prisma.room.update({ where: { id: roomId }, data: { state: 'active', startedAt: new Date() } })

    io.to(roomChannel(roomId)).emit('battle.started', { battleId: battle.id })

    // run rounds sequentially (simple MVP)
    let p1Score = 0, p2Score = 0
    // const toWin = ceilHalf(room.bestOf)
    // for (let roundNo = 1; roundNo <= room.bestOf; roundNo++) {
    //   const seed = `${battle.id}:${roundNo}:${Date.now()}`
    //   const result = runRound(seed, p1.userId, p2.userId)

    //   await prisma.round.create({
    //     data: {
    //       battleId: battle.id,
    //       roundNo,
    //       winnerUserId: result.winnerUserId,
    //       p1Outcome: result.p1,
    //       p2Outcome: result.p2,
    //     }
    //   })

    //   if (result.winnerUserId === p1.userId) p1Score++; else p2Score++;
    //   io.to(roomChannel(roomId)).emit('round.finished', { round: roundNo, score: { p1: p1Score, p2: p2Score }, winnerUserId: result.winnerUserId })

    //   if (p1Score === toWin || p2Score === toWin) break
    // }

    const winnerUserId = p1Score > p2Score ? p1.userId : p2.userId
    await prisma.battle.update({
      where: { id: battle.id },
      data: { p1Score, p2Score, winnerUserId, status: 'done' }
    })
    await prisma.room.update({ where: { id: roomId }, data: { state: 'finished', endedAt: new Date() } })

    // update user stats + naive ELO delta
    const delta = 10;
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
  const top = await prisma.user.findMany({ orderBy: { elo: 'desc' }, take: limit, select: { id: true, elo: true, wins: true, losses: true } })
  res.json({ entries: top })
})

const PORT = process.env.PORT || 3000
http.listen(PORT, () => console.log('Server listening on', PORT))
