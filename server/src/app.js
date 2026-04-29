// src/app.js — Express puro, sem httpServer.listen()
// Usado pelos testes via supertest; o index.js importa daqui e chama listen()

const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/rooms', require('./routes/rooms'))
app.use('/api/v1/characters', require('./routes/characters'))
app.use('/api/v1/skills', require('./routes/skills'))
app.use('/api/v1/investments', require('./routes/investments'))
app.use('/api/v1', require('./routes/turns'))

app.get('/', (_req, res) => res.json({ message: 'RPG Financeiro API rodando!' }))

module.exports = app