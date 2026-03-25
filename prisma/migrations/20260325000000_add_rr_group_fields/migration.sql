-- AddColumn Event.groupSize
ALTER TABLE "Event" ADD COLUMN "groupSize" INTEGER;

-- AddColumn EventEntry.groupNumber
ALTER TABLE "EventEntry" ADD COLUMN "groupNumber" INTEGER;

-- AddColumn Match.groupNumber
ALTER TABLE "Match" ADD COLUMN "groupNumber" INTEGER;
