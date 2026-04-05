-- v0.18.3: scope MatchResultSubmission.confirmationCode uniqueness to tournament
-- Replaces global @unique on confirmationCode with @@unique([tournamentId, confirmationCode])

-- 1. Add tournamentId column (nullable while we back-fill)
ALTER TABLE "MatchResultSubmission" ADD COLUMN "tournamentId" TEXT;

-- 2. Back-fill from match → event chain
UPDATE "MatchResultSubmission" mrs
SET "tournamentId" = (
  SELECT e."tournamentId"
  FROM "Match" m
  JOIN "Event" e ON m."eventId" = e.id
  WHERE m.id = mrs."matchId"
);

-- 3. Make NOT NULL
ALTER TABLE "MatchResultSubmission" ALTER COLUMN "tournamentId" SET NOT NULL;

-- 4. Add FK to Tournament (cascade on delete)
ALTER TABLE "MatchResultSubmission"
ADD CONSTRAINT "MatchResultSubmission_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Drop the old global unique constraint on confirmationCode
DROP INDEX "MatchResultSubmission_confirmationCode_key";

-- 6. Add the new tournament-scoped unique constraint
CREATE UNIQUE INDEX "MatchResultSubmission_tournamentId_confirmationCode_key"
ON "MatchResultSubmission"("tournamentId", "confirmationCode");
