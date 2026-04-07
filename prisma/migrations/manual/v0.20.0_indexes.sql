-- v0.20.0: indexes for common query patterns
-- PostgreSQL does not auto-index foreign key columns; these cover the hottest query paths.

-- Match.eventId — used in virtually every bracket/count/delete operation
CREATE INDEX IF NOT EXISTS "Match_eventId_idx" ON "Match" ("eventId");

-- Match.(eventId, status) — covers all count queries that filter by both
CREATE INDEX IF NOT EXISTS "Match_eventId_status_idx" ON "Match" ("eventId", "status");

-- Match.player1Id / player2Id — player match history uses OR [player1Id, player2Id]
CREATE INDEX IF NOT EXISTS "Match_player1Id_idx" ON "Match" ("player1Id");
CREATE INDEX IF NOT EXISTS "Match_player2Id_idx" ON "Match" ("player2Id");

-- EventEntry.playerProfileId — player tournament history traversal
CREATE INDEX IF NOT EXISTS "EventEntry_playerProfileId_idx" ON "EventEntry" ("playerProfileId");

-- RatingTransaction.playerProfileId — rating history per player
CREATE INDEX IF NOT EXISTS "RatingTransaction_playerProfileId_idx" ON "RatingTransaction" ("playerProfileId");

-- RatingTransaction.matchId — batch lookup during tournament/event deletion
CREATE INDEX IF NOT EXISTS "RatingTransaction_matchId_idx" ON "RatingTransaction" ("matchId");

-- MatchResultSubmission.matchId — submission lookup by match
CREATE INDEX IF NOT EXISTS "MatchResultSubmission_matchId_idx" ON "MatchResultSubmission" ("matchId");

-- Tournament.createdByClerkId — TD "my tournaments" view
CREATE INDEX IF NOT EXISTS "Tournament_createdByClerkId_idx" ON "Tournament" ("createdByClerkId");
