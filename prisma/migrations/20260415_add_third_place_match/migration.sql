-- Add hasThirdPlaceMatch to Event
ALTER TABLE "Event" ADD COLUMN "hasThirdPlaceMatch" BOOLEAN NOT NULL DEFAULT false;

-- Add isThirdPlaceMatch to Match
ALTER TABLE "Match" ADD COLUMN "isThirdPlaceMatch" BOOLEAN NOT NULL DEFAULT false;
