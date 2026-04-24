const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
require('dotenv').config()

const app = express()
const httpServer = http.createServer(app)

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
})

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// rotas
app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/rooms', require('./routes/rooms'))
app.use('/api/v1/characters', require('./routes/characters'))
app.use('/api/v1/skills', require('./routes/skills'))
app.use('/api/v1/investments', require('./routes/investments'))
app.use('/api/v1', require('./routes/turns'))

app.get('/', (req, res) => res.json({ message: 'RPG Financeiro API rodando!' }))

// socket
io.on('connection', (socket) => {
  console.log('Jogador conectado:', socket.id)

  socket.on('room:join', ({ roomId, characterId }) => {
    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.characterId = characterId
    socket.to(roomId).emit('room:player-joined', { characterId })
    console.log(`${characterId} entrou na sala ${roomId}`)
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

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))