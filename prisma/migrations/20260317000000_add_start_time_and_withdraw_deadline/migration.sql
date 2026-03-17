-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "startTime" TIMESTAMP(3),
ADD COLUMN "withdrawDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "startTime" TIMESTAMP(3);
