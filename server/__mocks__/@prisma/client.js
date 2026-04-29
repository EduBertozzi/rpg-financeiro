// __mocks__/@prisma/client.js

const prismaMock = {
  room: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  character: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  leaderboard: {
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  investment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  fixedIncomeInvestment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  debentureInvestment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  marketAsset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  assetPrice: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  financialSnapshot: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  characterEventLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  asset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  skill: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  skillNode: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  characterSkillPoints: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  variableIncomePosition: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tradeHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  characterSkill: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((arg) => {
    if (typeof arg === 'function') return arg(prismaMock)
    return Promise.all(arg)
  }),
  $disconnect: jest.fn(),
}

const PrismaClient = jest.fn(() => prismaMock)

module.exports = { PrismaClient, prismaMock }