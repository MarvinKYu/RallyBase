-- v0.14.0: Add RR_TO_SE hybrid event format
-- Adds new EventFormat enum value, advancersPerGroup on Event, and advancesToSE on EventEntry

ALTER TYPE "EventFormat" ADD VALUE 'RR_TO_SE';

ALTER TABLE "Event" ADD COLUMN "advancersPerGroup" INTEGER;

ALTER TABLE "EventEntry" ADD COLUMN "advancesToSE" BOOLEAN;
