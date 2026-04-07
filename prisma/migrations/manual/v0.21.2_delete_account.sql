-- v0.21.2: add isDeleted and deletedAt to PlayerProfile for account anonymization
ALTER TABLE "PlayerProfile"
  ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
