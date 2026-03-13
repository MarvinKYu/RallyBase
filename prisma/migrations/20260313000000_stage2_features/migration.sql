-- Stage 2 Features Migration

-- CreateEnum: Gender
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum: EventFormat
CREATE TYPE "EventFormat" AS ENUM ('SINGLE_ELIMINATION', 'ROUND_ROBIN');

-- AlterTable: PlayerProfile — add playerNumber, gender, birthDate
ALTER TABLE "PlayerProfile" ADD COLUMN "playerNumber" SERIAL;
ALTER TABLE "PlayerProfile" ADD COLUMN "gender" "Gender";
ALTER TABLE "PlayerProfile" ADD COLUMN "birthDate" TIMESTAMP(3);

-- CreateIndex: playerNumber unique
CREATE UNIQUE INDEX "PlayerProfile_playerNumber_key" ON "PlayerProfile"("playerNumber");

-- AlterTable: Event — add eventFormat, eligibility fields
ALTER TABLE "Event" ADD COLUMN "eventFormat" "EventFormat" NOT NULL DEFAULT 'SINGLE_ELIMINATION';
ALTER TABLE "Event" ADD COLUMN "maxParticipants" INTEGER;
ALTER TABLE "Event" ADD COLUMN "minRating" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "maxRating" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "minAge" INTEGER;
ALTER TABLE "Event" ADD COLUMN "maxAge" INTEGER;
