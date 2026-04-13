-- v1.0.4: Add per-stage match format fields for RR_TO_SE events
-- rrFormat and rrGamePointTarget are null for non-RR_TO_SE events.
-- For RR_TO_SE events: rrFormat/rrGamePointTarget = RR stage; format/gamePointTarget = SE stage.

ALTER TABLE "Event" ADD COLUMN "rrFormat" "MatchFormat";
ALTER TABLE "Event" ADD COLUMN "rrGamePointTarget" INTEGER;
