CREATE TABLE "OrgAdmin" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgAdmin_userId_organizationId_key" ON "OrgAdmin"("userId", "organizationId");

ALTER TABLE "OrgAdmin" ADD CONSTRAINT "OrgAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgAdmin" ADD CONSTRAINT "OrgAdmin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
