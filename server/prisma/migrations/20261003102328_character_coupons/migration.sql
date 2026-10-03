-- CreateTable
CREATE TABLE "CharacterCoupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "spot" TEXT NOT NULL,
    "reward" TEXT NOT NULL,
    "claimedAt" DATETIME,
    "value" DECIMAL,
    CONSTRAINT "CharacterCoupon_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCoupon_characterId_turn_key" ON "CharacterCoupon"("characterId", "turn");
