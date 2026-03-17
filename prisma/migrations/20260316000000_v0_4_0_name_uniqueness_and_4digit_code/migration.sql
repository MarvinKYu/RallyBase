-- Tournament names must be unique within an organization
CREATE UNIQUE INDEX "Tournament_organizationId_name_key" ON "Tournament"("organizationId", "name");

-- Event names must be unique within a tournament
CREATE UNIQUE INDEX "Event_tournamentId_name_key" ON "Event"("tournamentId", "name");

-- Remove cuid() default from confirmationCode — codes are now generated in application code
ALTER TABLE "MatchResultSubmission" ALTER COLUMN "confirmationCode" DROP DEFAULT;
