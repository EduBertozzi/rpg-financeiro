-- CreateTable
CREATE TABLE "CharacterChoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "option" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterChoice_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "sourceTurn" INTEGER NOT NULL,
    "appliedAt" DATETIME,
    CONSTRAINT "ScheduledEffect_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterChoice_characterId_turn_kind_key" ON "CharacterChoice"("characterId", "turn", "kind");

-- CreateIndex
CREATE INDEX "ScheduledEffect_characterId_turn_idx" ON "ScheduledEffect"("characterId", "turn");
