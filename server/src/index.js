// src/index.js — só cuida do servidor HTTP e Socket.io
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = require('./app')

const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
  console.log('Jogador conectado:', socket.id)

  socket.on('room:join', ({ roomId, characterId }) => {
    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.characterId = characterId
    socket.to(roomId).emit('room:player-joined', { characterId })
  })

  socket.on('player:ready', ({ characterId, roomId }) => {
    socket.to(roomId).emit('room:player-ready', { characterId })
  })

  socket.on('admin:next-turn', async ({ roomId }) => {
    try {
      const { processTurn } = require('./utils/turnEngine')
      io.to(roomId).emit('turn:processing')
      const result = await processTurn(roomId)
      io.to(roomId).emit('turn:result', result)
      if (result.isFinished) io.to(roomId).emit('room:finished', result)
    } catch (err) {
      socket.emit('turn:error', { error: err.message })
    }
  })

  socket.on('turn:broadcast', ({ roomId, result }) => {
    io.to(roomId).emit('turn:result', result)
  })

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))