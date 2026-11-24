-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "CallerMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "PrizeStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'PRIZE', 'TICKET_BUY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freeTickets" INTEGER NOT NULL DEFAULT 0,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "ticketPrice" DECIMAL(12,2) NOT NULL,
    "carryOverFund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalFund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "callerMode" "CallerMode" NOT NULL DEFAULT 'AUTO',
    "autoInterval" INTEGER NOT NULL DEFAULT 10,
    "currentNumber" INTEGER,
    "calledNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numbers" JSONB NOT NULL,
    "row1Done" BOOLEAN NOT NULL DEFAULT false,
    "row2Done" BOOLEAN NOT NULL DEFAULT false,
    "row3Done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeLog" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "prizeAmount" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PrizeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "PrizeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "checkImage" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BankCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeLog" ADD CONSTRAINT "PrizeLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeLog" ADD CONSTRAINT "PrizeLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeLog" ADD CONSTRAINT "PrizeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

