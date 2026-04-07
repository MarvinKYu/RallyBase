# Capacity Planning

Current infrastructure tiers as of v0.20.0 (April 2026).

---

## Vercel — Hobby Plan

| Resource | Limit | Notes |
|----------|-------|-------|
| Web Analytics events | 50,000 / month | ~8,000 user sessions/month at 6 pages/session avg |
| Speed Insights data points | 10,000 / month | Lower limit — worth watching at scale |
| Serverless function invocations | 1,000,000 / month | Not a near-term concern |
| Active CPU time | 4 hours / month | Could pinch with sustained traffic; each server action counts |
| Bandwidth (fast data transfer) | 100 GB / month | Comfortable at current scale |
| Image transformations | 5,000 / month | Applies to `next/image` optimized requests |
| Blob storage | 1 GB | Not currently used |

**Upgrade trigger:** Vercel Pro is $20/month. Upgrade when:
- Active CPU hours approach 3.5 hours/month (87% of limit), or
- Analytics or Speed Insights events hit 80% of cap, or
- Sustained traffic causes slow cold starts due to function concurrency limits.

Pro raises Active CPU to 1,000 hours, Analytics to 25M events, Speed Insights to 50K events, and removes most practical limits.

---

## Neon — Free Tier

| Resource | Limit | Notes |
|----------|-------|-------|
| Storage | 0.5 GB | Most likely bottleneck as match/rating data grows |
| Compute | 100 CU-hours / month | Autoscales to 2 CU (8 GB RAM); scales to zero after 5 min idle |
| Projects | 100 | Not relevant |
| Branches | 10 per project | Used for dev/staging environments |
| Data transfer (egress) | 5 GB | Unlikely to hit at current scale |
| Point-in-time restore | 6 hours | Very limited — no recovery past 6 hours |
| Monitoring retention | 1 day | Can't look at query history older than 24 hours |

**Current storage estimate:** Each tournament with 2 events × 8 players generates roughly:
- ~16 EventEntry rows, ~28 Match rows, ~56–140 MatchGame rows, ~32 RatingTransaction rows
- Estimated ~10–15 KB per tournament (including indexes)
- 500 MB ÷ ~12 KB ≈ **~40,000 tournaments** before storage limit (very comfortable for now)

**Scale-to-zero cold start:** Neon pauses the compute after 5 minutes of inactivity. The first request after a pause has ~300–800ms added latency for the DB connection. This is observable on the free tier but acceptable for current traffic.

**Upgrade trigger:** Neon Launch is $19/month. Upgrade when:
- Storage approaches 400 MB (80% of 0.5 GB), or
- Scale-to-zero cold starts become a user-visible problem (upgrade removes the pause), or
- Need more than 6-hour point-in-time restore window.

Launch plan gives 10 GB storage, no compute pause, 7-day restore window.

---

## Summary

Both free tiers are comfortable for the current invite-only user base. The first real constraint will be **Neon's 0.5 GB storage** if tournament volume grows significantly, or **Vercel's 4 CPU-hours/month** if traffic ramps quickly. Neither is expected to be an issue before v1.0.0 public launch, but should be revisited once public registration opens.
