// src/index.js — só cuida do servidor HTTP e Socket.io
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = require('./app')
const realtime = require('./realtime')

const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] }
})

realtime.setIo(io)

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

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id)
  })
})

const PORT = process.env.PORT || 3001

// no Turso, aplica as migrations que faltam antes de abrir as portas
async function boot() {
  if (process.env.TURSO_DATABASE_URL) {
    try {
      await require('../scripts/migrate-turso').migrate()
    } catch (err) {
      console.error('Migrations do Turso falharam:', err.message)
    }
  }
  realtime.startClock()
  httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
}

boot()