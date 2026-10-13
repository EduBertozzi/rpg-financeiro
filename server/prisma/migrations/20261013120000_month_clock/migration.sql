-- AlterTable: relógio do mês (ADD COLUMN é seguro no Turso, sem recriar a tabela)
ALTER TABLE "Room" ADD COLUMN "monthMinutes" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Room" ADD COLUMN "dilemmaMinutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Room" ADD COLUMN "turnStartedAt" DATETIME;
ALTER TABLE "Character" ADD COLUMN "readyAt" DATETIME;
ALTER TABLE "Room" ADD COLUMN "pausedAt" DATETIME;
