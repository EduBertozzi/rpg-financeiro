-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "currentTurn" INTEGER NOT NULL DEFAULT 0,
    "maxTurns" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "avatarId" INTEGER NOT NULL DEFAULT 1,
    "course" TEXT NOT NULL,
    "gift" TEXT NOT NULL,
    "cash" DECIMAL(65,30) NOT NULL DEFAULT 7000,
    "monthlyIncome" DECIMAL(65,30) NOT NULL DEFAULT 7000,
    "housingCost" DECIMAL(65,30) NOT NULL DEFAULT 1500,
    "foodCost" DECIMAL(65,30) NOT NULL DEFAULT 800,
    "utilitiesCost" DECIMAL(65,30) NOT NULL DEFAULT 400,
    "transportCost" DECIMAL(65,30) NOT NULL DEFAULT 300,
    "housingLevel" INTEGER NOT NULL DEFAULT 1,
    "isBankrupt" BOOLEAN NOT NULL DEFAULT false,
    "overdraftDebt" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "loanDebt" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "turnReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillNode" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SkillNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "characterId" TEXT NOT NULL,
    "skillNodeId" INTEGER NOT NULL,
    "unlockedAt" INTEGER NOT NULL,

    CONSTRAINT "CharacterSkill_pkey" PRIMARY KEY ("characterId","skillNodeId")
);

-- CreateTable
CREATE TABLE "CharacterSkillPoints" (
    "characterId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "usedPoints" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "CharacterSkillPoints_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "FixedIncomeInvestment" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "monthlyRate" DECIMAL(65,30) NOT NULL,
    "investedAt" INTEGER NOT NULL,
    "redeemedAt" INTEGER,
    "redeemedValue" DECIMAL(65,30),
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FixedIncomeInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAsset" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sector" TEXT,
    "riskLevel" TEXT NOT NULL,
    "basePrice" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "MarketAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetPrice" (
    "assetId" INTEGER NOT NULL,
    "turn" INTEGER NOT NULL,
    "roomId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "AssetPrice_pkey" PRIMARY KEY ("assetId","turn","roomId")
);

-- CreateTable
CREATE TABLE "VariableIncomePosition" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "avgPrice" DECIMAL(65,30) NOT NULL,
    "boughtAt" INTEGER NOT NULL,

    CONSTRAINT "VariableIncomePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeHistory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "assetId" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "turn" INTEGER NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "riskRating" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "annualRate" DECIMAL(65,30) NOT NULL,
    "defaultProbability" DECIMAL(65,30),
    "availableFromTurn" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebentureInvestment" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "annualRate" DECIMAL(65,30) NOT NULL,
    "investedAt" INTEGER NOT NULL,
    "maturesAt" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "returnedValue" DECIMAL(65,30),

    CONSTRAINT "DebentureInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterEventLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "cashImpact" DECIMAL(65,30),
    "description" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "cash" DECIMAL(65,30) NOT NULL,
    "fixedIncome" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "variableIncome" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "debentures" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAssets" DECIMAL(65,30) NOT NULL,
    "totalDebts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netWorth" DECIMAL(65,30) NOT NULL,
    "incomeTaxPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "snappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "roomId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "finalRank" INTEGER,
    "netWorth" DECIMAL(65,30),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("roomId","characterId")
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

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkill" ADD CONSTRAINT "CharacterSkill_skillNodeId_fkey" FOREIGN KEY ("skillNodeId") REFERENCES "SkillNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSkillPoints" ADD CONSTRAINT "CharacterSkillPoints_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedIncomeInvestment" ADD CONSTRAINT "FixedIncomeInvestment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPrice" ADD CONSTRAINT "AssetPrice_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPrice" ADD CONSTRAINT "AssetPrice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableIncomePosition" ADD CONSTRAINT "VariableIncomePosition_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableIncomePosition" ADD CONSTRAINT "VariableIncomePosition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeHistory" ADD CONSTRAINT "TradeHistory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeHistory" ADD CONSTRAINT "TradeHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebentureInvestment" ADD CONSTRAINT "DebentureInvestment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebentureInvestment" ADD CONSTRAINT "DebentureInvestment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterEventLog" ADD CONSTRAINT "CharacterEventLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
