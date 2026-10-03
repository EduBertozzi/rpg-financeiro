-- AlterTable: nome da turma (ADD COLUMN é seguro no Turso, sem recriar a tabela)
ALTER TABLE "Room" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
