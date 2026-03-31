CREATE TABLE "TournamentCreatorAllowlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentCreatorAllowlist_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TournamentCreatorAllowlist" ADD CONSTRAINT "TournamentCreatorAllowlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentCreatorAllowlist" ADD CONSTRAINT "TournamentCreatorAllowlist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TournamentCreatorAllowlist_userId_organizationId_key" ON "TournamentCreatorAllowlist"("userId", "organizationId");
