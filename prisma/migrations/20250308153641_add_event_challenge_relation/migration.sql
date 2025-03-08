/*
  Warnings:

  - A unique constraint covering the columns `[name,teamId,eventId]` on the table `Challenge` will be added. If there are existing duplicate values, this will fail.
  - Made the column `eventId` on table `Challenge` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Challenge" DROP CONSTRAINT "Challenge_eventId_fkey";

-- DropIndex
DROP INDEX "Challenge_name_teamId_key";

-- AlterTable
ALTER TABLE "Challenge" ALTER COLUMN "eventId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_name_teamId_eventId_key" ON "Challenge"("name", "teamId", "eventId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
