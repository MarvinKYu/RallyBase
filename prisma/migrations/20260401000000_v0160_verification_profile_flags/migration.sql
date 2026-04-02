-- v0.16.0: verification method, profile visibility flags, DOB protection

-- 1. VerificationMethod enum
CREATE TYPE "VerificationMethod" AS ENUM ('CODE', 'BIRTH_YEAR', 'BOTH');

-- 2. Tournament.verificationMethod
ALTER TABLE "Tournament" ADD COLUMN "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'CODE';

-- 3. PlayerProfile visibility flags
ALTER TABLE "PlayerProfile" ADD COLUMN "showGender" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlayerProfile" ADD COLUMN "showAge" BOOLEAN NOT NULL DEFAULT false;
