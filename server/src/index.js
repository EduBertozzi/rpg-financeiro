const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
require('dotenv').config()

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
})

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// rotas
app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/rooms', require('./routes/rooms'))
app.use('/api/v1/characters', require('./routes/characters'))

app.get('/', (req, res) => res.json({ message: 'RPG Financeiro API rodando!' }))

// socket
io.on('connection', (socket) => {
  console.log('Jogador conectado:', socket.id)
  socket.on('disconnect', () => console.log('Jogador desconectado:', socket.id))
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))