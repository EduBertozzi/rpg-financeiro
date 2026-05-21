-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "maxTurns" INTEGER NOT NULL DEFAULT 12,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "Room_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "avatarId" INTEGER NOT NULL DEFAULT 1,
    "course" TEXT NOT NULL,
    "gift" TEXT NOT NULL,
    "cash" DECIMAL NOT NULL DEFAULT 6000,
    "monthlyIncome" DECIMAL NOT NULL DEFAULT 6000,
    "housingCost" DECIMAL NOT NULL DEFAULT 1500,
    "foodCost" DECIMAL NOT NULL DEFAULT 1000,
    "utilitiesCost" DECIMAL NOT NULL DEFAULT 250,
    "transportCost" DECIMAL NOT NULL DEFAULT 250,
    "housingLevel" INTEGER NOT NULL DEFAULT 1,
    "isBankrupt" BOOLEAN NOT NULL DEFAULT false,
    "overdraftDebt" DECIMAL NOT NULL DEFAULT 0,
    "loanDebt" DECIMAL NOT NULL DEFAULT 0,
    "turnReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Character_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillNode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "path" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "characterId" TEXT NOT NULL,
    "skillNodeId" INTEGER NOT NULL,
    "unlockedAt" INTEGER NOT NULL,

    PRIMARY KEY ("characterId", "skillNodeId"),
    CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CharacterSkill_skillNodeId_fkey" FOREIGN KEY ("skillNodeId") REFERENCES "SkillNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterSkillPoints" (
    "characterId" TEXT NOT NULL PRIMARY KEY,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "usedPoints" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL DEFAULT 8,
    CONSTRAINT "CharacterSkillPoints_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FixedIncomeInvestment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "monthlyRate" DECIMAL NOT NULL,
    "investedAt" INTEGER NOT NULL,
    "redeemedAt" INTEGER,
    "redeemedValue" DECIMAL,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FixedIncomeInvestment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sector" TEXT,
    "riskLevel" TEXT NOT NULL,
    "basePrice" DECIMAL NOT NULL
);

-- CreateTable
CREATE TABLE "AssetPrice" (
    "assetId" INTEGER NOT NULL,
    "turn" INTEGER NOT NULL,
    "roomId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,

    PRIMARY KEY ("assetId", "turn", "roomId"),
    CONSTRAINT "AssetPrice_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssetPrice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VariableIncomePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "avgPrice" DECIMAL NOT NULL,
    "boughtAt" INTEGER NOT NULL,
    CONSTRAINT "VariableIncomePosition_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VariableIncomePosition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "turn" INTEGER NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeHistory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TradeHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "riskRating" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "annualRate" DECIMAL NOT NULL,
    "defaultProbability" DECIMAL,
    "availableFromTurn" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "DebentureInvestment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "annualRate" DECIMAL NOT NULL,
    "investedAt" INTEGER NOT NULL,
    "maturesAt" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "returnedValue" DECIMAL,
    CONSTRAINT "DebentureInvestment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DebentureInvestment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterEventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "cashImpact" DECIMAL,
    "description" TEXT NOT NULL,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterEventLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "cash" DECIMAL NOT NULL,
    "fixedIncome" DECIMAL NOT NULL DEFAULT 0,
    "variableIncome" DECIMAL NOT NULL DEFAULT 0,
    "debentures" DECIMAL NOT NULL DEFAULT 0,
    "totalAssets" DECIMAL NOT NULL,
    "totalDebts" DECIMAL NOT NULL DEFAULT 0,
    "netWorth" DECIMAL NOT NULL,
    "incomeTaxPaid" DECIMAL NOT NULL DEFAULT 0,
    "snappedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "roomId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "finalRank" INTEGER,
    "netWorth" DECIMAL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("roomId", "characterId"),
    CONSTRAINT "Leaderboard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Leaderboard_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_roomId_key" ON "Character"("userId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillNode_path_level_key" ON "SkillNode"("path", "level");

-- CreateIndex
CREATE UNIQUE INDEX "MarketAsset_ticker_key" ON "MarketAsset"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSnapshot_characterId_turn_key" ON "FinancialSnapshot"("characterId", "turn");

-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_characterId_key" ON "Leaderboard"("characterId");
