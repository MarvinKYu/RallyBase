-- Enable row-level security on tables that store personal or sensitive user data.
-- The app DB user (neondb_owner) is the table owner and bypasses RLS by default
-- in PostgreSQL, so existing application behavior is unchanged.
-- This establishes the RLS framework for future restrictive policies
-- (e.g., for a read-only analytics role).

ALTER TABLE "PlayerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlayerRating" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RatingTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchResultSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match" ENABLE ROW LEVEL SECURITY;
