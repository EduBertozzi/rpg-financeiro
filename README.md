# 🎮 RPG Financeiro

Jogo de simulação financeira multiplayer em tempo real desenvolvido para o INATEL. Jogadores criam personagens, tomam decisões de investimento e enfrentam dilemas financeiros ao longo de 12 turnos mensais, competindo pelo maior patrimônio líquido ao final.

**Demo:** https://rpg-financeiro.vercel.app

---

## Tecnologias

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Zustand (estado global)
- Socket.io Client
- React Router DOM

**Backend**
- Node.js + Express 5
- PostgreSQL + Prisma ORM
- Socket.io
- JWT (autenticação)
- bcryptjs

**Testes**
- Jest + Supertest (testes de backend)
- Playwright (testes E2E)
- k6 (testes de carga)

**Deploy**
- Frontend: Vercel
- Backend: Railway
- Banco de dados: PostgreSQL (Railway)

---

## Arquitetura

```
rpg-financeiro/
├── client/                          # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   └── GameHeader.jsx       # Header global sticky
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   ├── CharacterCreation/
│   │   │   ├── Map/                 # Tela principal com Socket.io
│   │   │   ├── Bank/                # Renda fixa
│   │   │   ├── Broker/              # Ações e FIIs
│   │   │   ├── Companies/           # Debêntures
│   │   │   ├── SkillTree/           # Árvore de habilidades
│   │   │   ├── Dilemma/             # Dilema mensal
│   │   │   ├── Admin/               # Painel do admin
│   │   │   └── Finished/            # Tela de fim de jogo
│   │   ├── services/
│   │   │   ├── api.js               # Axios com interceptor de token
│   │   │   └── socket.js            # Socket.io client
│   │   └── store/
│   │       └── gameStore.js         # Zustand com persist
│   └── e2e/                         # Testes E2E com Playwright
│
└── server/                          # Backend Node.js
    ├── src/
    │   ├── controllers/             # Lógica de cada rota
    │   ├── middleware/
    │   │   └── auth.js              # Middleware JWT
    │   ├── routes/                  # Definição das rotas
    │   └── utils/
    │       └── turnEngine.js        # Motor de turnos
    ├── prisma/
    │   └── schema.prisma            # Schema do banco
    └── __tests__/                   # Testes de backend com Jest
```

---

## Fluxo do jogo

```
Login/Register → Criar Personagem → Aguardar Sala → Jogo (12 turnos)
                                                          ↓
                                         [Investir → Dilema → Admin avança turno]
                                                          ↓
                                                    Fim de Jogo → Ranking
```

Cada turno mensal inclui:
1. **Custos fixos** descontados automaticamente (moradia, alimentação, transporte, utilidades)
2. **Rendimentos** de investimentos em renda fixa aplicados
3. **Evento aleatório** (positivo ou negativo)
4. **Dilema financeiro** — jogador escolhe uma opção com consequências reais
5. **Mercado** atualiza preços de ações com variação baseada em risco

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- npm

### Backend

```bash
cd server
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com DATABASE_URL, JWT_SECRET, FRONTEND_URL, PORT

# Rodar migrations
npx prisma migrate dev

# Popular banco com dados iniciais
node src/utils/seed.js

# Iniciar servidor
npm run dev
```

### Frontend

```bash
cd client
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com VITE_API_URL, VITE_SOCKET_URL

# Iniciar aplicação
npm run dev
```

Acesse `http://localhost:5173`

---

## Variáveis de ambiente

### Backend (`server/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rpg_financeiro
JWT_SECRET=seu_jwt_secret
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001
```

---

## Testes

### Backend — Jest + Supertest

```bash
cd server
npm test                  # roda todos os testes
npm run test:coverage     # com relatório de cobertura
```

**Resultado:**
| Suite | Testes | Status |
|-------|--------|--------|
| auth.test.js | 7 | ✅ |
| rooms.test.js | 11 | ✅ |
| characters.test.js | 10 | ✅ |
| investments.test.js | 28 | ✅ |
| skills.test.js | 9 | ✅ |
| turns.test.js | 17 | ✅ |
| turnEngine.test.js | 14 | ✅ |
| middleware/auth.test.js | 5 | ✅ |
| **Total** | **101** | **100%** |

**Cobertura:**
| Arquivo | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| authController | 93% | 100% | 100% | 92% |
| characterController | 90% | 85% | 100% | 90% |
| roomController | 93% | 100% | 100% | 91% |
| skillController | 87% | 80% | 71% | 88% |
| turnController | 76% | 79% | 100% | 75% |
| turnEngine | 78% | 63% | 85% | 77% |
| **Geral** | **~74%** | **~65%** | **~79%** | **~75%** |

### E2E — Playwright

```bash
cd client
npx playwright test                        # todos os browsers
npx playwright test --project=chromium    # só Chromium
npx playwright test --headed              # com browser visível
npx playwright show-report                # relatório HTML
```

**Resultado:**
| Suite | Testes | Browsers |
|-------|--------|----------|
| auth.spec.js | 4 | Chromium + Mobile Chrome |
| character.spec.js | 7 | Chromium + Mobile Chrome |
| navigation.spec.js | 6 | Chromium + Mobile Chrome |
| finished.spec.js | 4 | Chromium + Mobile Chrome |
| responsive.spec.js | 4 | Chromium + Mobile Chrome |
| **Total** | **50** | **100%** |

### Carga — k6

```bash
# Instalar k6: https://k6.io/docs/get-started/installation/

k6 run k6/smoke.test.js       # 1 usuário — verifica API
k6 run k6/auth.test.js        # 10 usuários — login/register
k6 run k6/rooms.test.js       # 20 usuários — operações de sala
k6 run k6/full-game.test.js   # 15 usuários — cenários simultâneos
```

**Resultado:**
| Teste | VUs | Checks | Erros | p(95) |
|-------|-----|--------|-------|-------|
| smoke | 1 | 25/25 ✅ | 0% | 69ms |
| auth | 10 | 424/424 ✅ | 0% | 127ms |
| rooms | 20 | 1028/1028 ✅ | 0% | 694ms |
| full-game | 15 | 211/211 ✅ | 0% | 288ms |

---

## API — Principais endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/register` | Criar conta |
| POST | `/api/v1/auth/login` | Login |

### Salas
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/rooms` | Criar sala (admin) |
| GET | `/api/v1/rooms/:code` | Buscar sala por código |
| POST | `/api/v1/rooms/:id/start` | Iniciar partida |
| GET | `/api/v1/rooms/:id/leaderboard` | Ranking final |

### Personagens
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/characters` | Criar personagem |
| GET | `/api/v1/characters/me` | Meu personagem |
| GET | `/api/v1/characters/:id` | Personagem por ID |
| PATCH | `/api/v1/characters/:id/ready` | Marcar como pronto |

### Investimentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/investments/fixed/:id` | Renda fixa do personagem |
| POST | `/api/v1/investments/fixed/:id` | Investir em renda fixa |
| DELETE | `/api/v1/investments/fixed/:id/:investmentId` | Resgatar |
| GET | `/api/v1/investments/market/:roomId` | Mercado de ativos |
| GET | `/api/v1/investments/portfolio/:id` | Carteira de ações |
| POST | `/api/v1/investments/trade/:id` | Comprar/vender ação |
| GET | `/api/v1/investments/companies` | Empresas disponíveis |
| GET | `/api/v1/investments/debentures/:id` | Debêntures do personagem |
| POST | `/api/v1/investments/debentures/:id` | Investir em debênture |

### Turnos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/rooms/:id/next-turn` | Avançar turno (admin) |
| GET | `/api/v1/characters/:id/dilemma/:turn` | Buscar dilema do turno |
| POST | `/api/v1/characters/:id/dilemma/:dilemmaId/choose` | Responder dilema |

### Skills
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/skills` | Todas as habilidades |
| GET | `/api/v1/skills/character/:id` | Skills do personagem |
| POST | `/api/v1/skills/character/:id/unlock/:skillId` | Desbloquear habilidade |

---

## Eventos de Socket.io

| Evento | Direção | Descrição |
|--------|---------|-----------|
| `room:join` | Cliente → Servidor | Entrar na sala |
| `room:player-joined` | Servidor → Cliente | Novo jogador entrou |
| `player:ready` | Cliente → Servidor | Jogador pronto |
| `room:player-ready` | Servidor → Cliente | Jogador marcou pronto |
| `admin:next-turn` | Cliente → Servidor | Admin avança turno |
| `turn:processing` | Servidor → Cliente | Turno sendo processado |
| `turn:result` | Servidor → Cliente | Resultado do turno |
| `room:finished` | Servidor → Cliente | Jogo finalizado |

---

## Licença

MIT 
