import { PrismaClient, RoleName, MatchStatus, SubmissionStatus } from "@prisma/client";

const prisma = new PrismaClient();

// ── Inline Elo (mirrors src/server/algorithms/elo.ts — keeps seed self-contained) ──────

const DEFAULT_RATING = 1500;

function getK(gamesPlayed: number) {
  return gamesPlayed < 30 ? 32 : gamesPlayed < 100 ? 24 : 16;
}

function calcMatchElo(
  winnerRating: number,
  loserRating: number,
  winnerGamesPlayed: number,
  loserGamesPlayed: number,
) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const winnerDelta = getK(winnerGamesPlayed) * (1 - expected);
  const loserDelta = getK(loserGamesPlayed) * (0 - (1 - expected));
  return { winnerDelta, loserDelta };
}

// ── Helper: complete a match and apply ratings ────────────────────────────────────────

async function completeMatch({
  matchId,
  tournamentId,
  matchPosition,
  nextMatchId,
  submittedById,
  winnerId,
  loserId,
  ratingCategoryId,
  games,
}: {
  matchId: string;
  tournamentId: string;
  matchPosition: number;
  nextMatchId: string | null;
  submittedById: string;
  winnerId: string;
  loserId: string;
  ratingCategoryId: string;
  games: { player1Points: number; player2Points: number }[];
}) {
  // Fetch current ratings
  const [wr, lr] = await Promise.all([
    prisma.playerRating.findUnique({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: winnerId, ratingCategoryId } },
    }),
    prisma.playerRating.findUnique({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: loserId, ratingCategoryId } },
    }),
  ]);

  const winnerBefore = wr?.rating ?? DEFAULT_RATING;
  const loserBefore = lr?.rating ?? DEFAULT_RATING;
  const winnerGP = wr?.gamesPlayed ?? 0;
  const loserGP = lr?.gamesPlayed ?? 0;

  const { winnerDelta, loserDelta } = calcMatchElo(
    winnerBefore,
    loserBefore,
    winnerGP,
    loserGP,
  );

  const nextMatchSlot: "player1Id" | "player2Id" =
    matchPosition % 2 === 1 ? "player1Id" : "player2Id";

  await prisma.$transaction(async (tx) => {
    // Confirmed submission record
    await tx.matchResultSubmission.create({
      data: {
        matchId,
        tournamentId,
        submittedById,
        confirmationCode: Math.floor(Math.random() * 10000).toString().padStart(4, "0"),
        status: SubmissionStatus.CONFIRMED,
        confirmedAt: new Date(),
        games: { create: games.map((g, i) => ({ gameNumber: i + 1, ...g })) },
      },
    });

    // Official per-game scores
    await tx.matchGame.createMany({
      data: games.map((g, i) => ({ matchId, gameNumber: i + 1, ...g })),
    });

    // Complete match
    await tx.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.COMPLETED, winnerId },
    });

    // Advance winner to next match slot
    if (nextMatchId) {
      await tx.match.update({
        where: { id: nextMatchId },
        data: { [nextMatchSlot]: winnerId },
      });
    }

    // Upsert rating snapshots
    await tx.playerRating.upsert({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: winnerId, ratingCategoryId } },
      update: { rating: winnerBefore + winnerDelta, gamesPlayed: { increment: 1 } },
      create: { playerProfileId: winnerId, ratingCategoryId, rating: winnerBefore + winnerDelta, gamesPlayed: 1 },
    });
    await tx.playerRating.upsert({
      where: { playerProfileId_ratingCategoryId: { playerProfileId: loserId, ratingCategoryId } },
      update: { rating: loserBefore + loserDelta, gamesPlayed: { increment: 1 } },
      create: { playerProfileId: loserId, ratingCategoryId, rating: loserBefore + loserDelta, gamesPlayed: 1 },
    });

    // Immutable ledger entries
    await tx.ratingTransaction.createMany({
      data: [
        {
          playerProfileId: winnerId,
          ratingCategoryId,
          matchId,
          ratingBefore: winnerBefore,
          ratingAfter: winnerBefore + winnerDelta,
          delta: winnerDelta,
        },
        {
          playerProfileId: loserId,
          ratingCategoryId,
          matchId,
          ratingBefore: loserBefore,
          ratingAfter: loserBefore + loserDelta,
          delta: loserDelta,
        },
      ],
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────────────

async function main() {
  // ── System data (roles, orgs, disciplines, rating categories) ──────────────────────

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  console.log(`Seeded ${roles.length} roles`);

  const usatt = await prisma.organization.upsert({
    where: { slug: "usatt" },
    update: {},
    create: { name: "USATT", slug: "usatt" },
  });

  const nctta = await prisma.organization.upsert({
    where: { slug: "nctta" },
    update: {},
    create: { name: "NCTTA", slug: "nctta" },
  });

  const usattSingles = await prisma.discipline.upsert({
    where: { organizationId_name: { organizationId: usatt.id, name: "Singles" } },
    update: {},
    create: { organizationId: usatt.id, name: "Singles" },
  });

  const ncttaSingles = await prisma.discipline.upsert({
    where: { organizationId_name: { organizationId: nctta.id, name: "Singles" } },
    update: {},
    create: { organizationId: nctta.id, name: "Singles" },
  });

  const usattCat = await prisma.ratingCategory.upsert({
    where: { organizationId_disciplineId: { organizationId: usatt.id, disciplineId: usattSingles.id } },
    update: {},
    create: { organizationId: usatt.id, disciplineId: usattSingles.id, name: "USATT Singles" },
  });

  await prisma.ratingCategory.upsert({
    where: { organizationId_disciplineId: { organizationId: nctta.id, disciplineId: ncttaSingles.id } },
    update: {},
    create: { organizationId: nctta.id, disciplineId: ncttaSingles.id, name: "NCTTA Singles" },
  });

  const rallybase = await prisma.organization.upsert({
    where: { slug: "rallybase" },
    update: {},
    create: { name: "RallyBase", slug: "rallybase" },
  });

  const rallybaseSingles = await prisma.discipline.upsert({
    where: { organizationId_name: { organizationId: rallybase.id, name: "Singles" } },
    update: {},
    create: { organizationId: rallybase.id, name: "Singles" },
  });

  await prisma.ratingCategory.upsert({
    where: { organizationId_disciplineId: { organizationId: rallybase.id, disciplineId: rallybaseSingles.id } },
    update: {},
    create: { organizationId: rallybase.id, disciplineId: rallybaseSingles.id, name: "RallyBase Singles" },
  });

  console.log("Seeded organizations, disciplines, and rating categories");

  // ── Demo data guard ─────────────────────────────────────────────────────────────────

  const existingDemo = await prisma.tournament.findFirst({
    where: { name: "2026 TTRC Spring Open" },
  });
  if (existingDemo) {
    console.log("Demo data already exists — skipping");
    return;
  }

  // ── Demo players ────────────────────────────────────────────────────────────────────

  const playerData = [
    { clerkId: "demo_player_1", email: "alex.chen@demo.rallybase", name: "Alex Chen" },
    { clerkId: "demo_player_2", email: "maria.santos@demo.rallybase", name: "Maria Santos" },
    { clerkId: "demo_player_3", email: "jake.williams@demo.rallybase", name: "Jake Williams" },
    { clerkId: "demo_player_4", email: "priya.patel@demo.rallybase", name: "Priya Patel" },
    { clerkId: "demo_player_5", email: "carlos.gomez@demo.rallybase", name: "Carlos Gomez" },
    { clerkId: "demo_player_6", email: "yuki.tanaka@demo.rallybase", name: "Yuki Tanaka" },
    { clerkId: "demo_player_7", email: "sam.davies@demo.rallybase", name: "Sam Davies" },
    { clerkId: "demo_player_8", email: "mia.johnson@demo.rallybase", name: "Mia Johnson" },
  ];

  const profileIds: string[] = [];

  for (const p of playerData) {
    const user = await prisma.user.upsert({
      where: { clerkId: p.clerkId },
      update: {},
      create: { clerkId: p.clerkId, email: p.email, name: p.name },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, displayName: p.name },
    });
    profileIds.push(profile.id);
  }

  // profileIds[0..7] = seeds 1..8
  const [s1, s2, s3, s4, s5, s6, s7, s8] = profileIds;
  console.log(`Seeded ${playerData.length} demo players`);

  // ── Demo tournament ─────────────────────────────────────────────────────────────────

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: usatt.id,
      name: "2026 TTRC Spring Open",
      location: "Austin Recreation Center, Austin TX",
      startDate: new Date("2026-04-12"),
      endDate: new Date("2026-04-13"),
      status: "PUBLISHED",
    },
  });

  const event = await prisma.event.create({
    data: {
      tournamentId: tournament.id,
      ratingCategoryId: usattCat.id,
      name: "Open Singles",
      format: "BEST_OF_5",
      gamePointTarget: 11,
    },
  });

  console.log(`Seeded tournament: ${tournament.name}`);

  // ── Entries (seeds 1–8) ─────────────────────────────────────────────────────────────

  for (let i = 0; i < profileIds.length; i++) {
    await prisma.eventEntry.create({
      data: { eventId: event.id, playerProfileId: profileIds[i], seed: i + 1 },
    });
  }

  // ── Bracket: 8 players → bracketSize=8, totalRounds=3 ──────────────────────────────
  // Created final→R1 so nextMatchId references are available when earlier rounds are made.

  const final = await prisma.match.create({
    data: { eventId: event.id, round: 3, position: 1, status: MatchStatus.PENDING },
  });

  // Semis: both feed into final
  // pos1 winner → final player1Id (odd), pos2 winner → final player2Id (even)
  const sf1 = await prisma.match.create({
    data: { eventId: event.id, round: 2, position: 1, nextMatchId: final.id, status: MatchStatus.PENDING },
  });
  const sf2 = await prisma.match.create({
    data: { eventId: event.id, round: 2, position: 2, nextMatchId: final.id, status: MatchStatus.PENDING },
  });

  // Quarters
  // pos1 (odd) → sf1 player1Id | pos2 (even) → sf1 player2Id
  // pos3 (odd) → sf2 player1Id | pos4 (even) → sf2 player2Id
  const qf1 = await prisma.match.create({
    data: { eventId: event.id, round: 1, position: 1, player1Id: s1, player2Id: s8, nextMatchId: sf1.id, status: MatchStatus.PENDING },
  });
  const qf2 = await prisma.match.create({
    data: { eventId: event.id, round: 1, position: 2, player1Id: s2, player2Id: s7, nextMatchId: sf1.id, status: MatchStatus.PENDING },
  });
  const qf3 = await prisma.match.create({
    data: { eventId: event.id, round: 1, position: 3, player1Id: s3, player2Id: s6, nextMatchId: sf2.id, status: MatchStatus.PENDING },
  });
  const qf4 = await prisma.match.create({
    data: { eventId: event.id, round: 1, position: 4, player1Id: s4, player2Id: s5, nextMatchId: sf2.id, status: MatchStatus.PENDING },
  });

  console.log("Generated bracket (7 matches)");

  // ── Complete the 4 quarterfinal matches ─────────────────────────────────────────────
  // QF1: seed1 (Alex) beats seed8 (Mia) 3-0
  await completeMatch({
    matchId: qf1.id,
    tournamentId: tournament.id,
    matchPosition: 1,
    nextMatchId: sf1.id,
    submittedById: s1,
    winnerId: s1,
    loserId: s8,
    ratingCategoryId: usattCat.id,
    games: [
      { player1Points: 11, player2Points: 7 },
      { player1Points: 11, player2Points: 5 },
      { player1Points: 11, player2Points: 4 },
    ],
  });
  console.log("  QF1 complete: Alex Chen def. Mia Johnson 3-0");

  // QF2: seed2 (Maria) beats seed7 (Sam) 3-1
  await completeMatch({
    matchId: qf2.id,
    tournamentId: tournament.id,
    matchPosition: 2,
    nextMatchId: sf1.id,
    submittedById: s2,
    winnerId: s2,
    loserId: s7,
    ratingCategoryId: usattCat.id,
    games: [
      { player1Points: 11, player2Points: 8 },
      { player1Points: 8, player2Points: 11 },
      { player1Points: 11, player2Points: 6 },
      { player1Points: 11, player2Points: 9 },
    ],
  });
  console.log("  QF2 complete: Maria Santos def. Sam Davies 3-1");

  // QF3: seed3 (Jake) beats seed6 (Yuki) 3-2
  await completeMatch({
    matchId: qf3.id,
    tournamentId: tournament.id,
    matchPosition: 3,
    nextMatchId: sf2.id,
    submittedById: s3,
    winnerId: s3,
    loserId: s6,
    ratingCategoryId: usattCat.id,
    games: [
      { player1Points: 11, player2Points: 9 },
      { player1Points: 9, player2Points: 11 },
      { player1Points: 11, player2Points: 7 },
      { player1Points: 7, player2Points: 11 },
      { player1Points: 11, player2Points: 8 },
    ],
  });
  console.log("  QF3 complete: Jake Williams def. Yuki Tanaka 3-2");

  // QF4: seed5 (Carlos) upsets seed4 (Priya) 3-1 → player2 wins
  await completeMatch({
    matchId: qf4.id,
    tournamentId: tournament.id,
    matchPosition: 4,
    nextMatchId: sf2.id,
    submittedById: s5,  // Carlos (player2) submitted
    winnerId: s5,
    loserId: s4,
    ratingCategoryId: usattCat.id,
    games: [
      { player1Points: 9, player2Points: 11 },
      { player1Points: 7, player2Points: 11 },
      { player1Points: 11, player2Points: 8 },
      { player1Points: 8, player2Points: 11 },
    ],
  });
  console.log("  QF4 complete: Carlos Gomez def. Priya Patel 3-1 (upset!)");

  // ── Semis now show: SF1 = Alex vs Maria, SF2 = Jake vs Carlos ──────────────────────
  console.log(
    "\nDemo state: Quarterfinals complete. Semis pending:",
    "\n  SF1: Alex Chen vs Maria Santos",
    "\n  SF2: Jake Williams vs Carlos Gomez",
    "\n  Final: TBD",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
