-- CreateEnum
CREATE TYPE "AgentRunKind" AS ENUM ('ANALYZE', 'COMPARE', 'SEARCH');

-- CreateEnum
CREATE TYPE "AgentRunSource" AS ENUM ('CHAT', 'MCP');

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "kind" "AgentRunKind" NOT NULL,
    "source" "AgentRunSource" NOT NULL,
    "query" TEXT NOT NULL,
    "market" TEXT,
    "ticketUsd" DECIMAL(10,2),
    "verdict" TEXT,
    "confidence" TEXT,
    "compositeScore" INTEGER,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "title" TEXT,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_clerkUserId_createdAt_idx" ON "AgentRun"("clerkUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_clerkUserId_updatedAt_idx" ON "Conversation"("clerkUserId", "updatedAt");
