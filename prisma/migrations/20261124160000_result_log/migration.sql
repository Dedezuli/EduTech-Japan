-- CreateTable
CREATE TABLE "ResultLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "attemptId" TEXT,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "detail" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResultLog_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultLog_attemptId_key" ON "ResultLog"("attemptId");

-- CreateIndex
CREATE INDEX "ResultLog_userId_createdAt_idx" ON "ResultLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResultLog_examId_idx" ON "ResultLog"("examId");
