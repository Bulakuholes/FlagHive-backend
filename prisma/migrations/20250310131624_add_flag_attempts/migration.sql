-- CreateTable
CREATE TABLE "FlagAttempt" (
    "id" TEXT NOT NULL,
    "flagValue" TEXT NOT NULL,
    "isSuccess" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlagAttempt_challengeId_idx" ON "FlagAttempt"("challengeId");

-- CreateIndex
CREATE INDEX "FlagAttempt_userId_idx" ON "FlagAttempt"("userId");

-- AddForeignKey
ALTER TABLE "FlagAttempt" ADD CONSTRAINT "FlagAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagAttempt" ADD CONSTRAINT "FlagAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
