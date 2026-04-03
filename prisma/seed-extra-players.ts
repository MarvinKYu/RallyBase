/**
 * One-time script: seed 24 additional demo players with USATT ratings
 * distributed between 1000 and 2000.
 *
 * Run with: npx tsx prisma/seed-extra-players.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTRA_PLAYERS = [
  { clerkId: "demo_extra_1",  email: "liam.chen@demo.rallybase",      name: "Liam Chen",      rating: 900  },
  { clerkId: "demo_extra_2",  email: "sofia.ramos@demo.rallybase",    name: "Sofia Ramos",    rating: 940  },
  { clerkId: "demo_extra_3",  email: "ethan.park@demo.rallybase",     name: "Ethan Park",     rating: 980  },
  { clerkId: "demo_extra_4",  email: "amara.diallo@demo.rallybase",   name: "Amara Diallo",   rating: 1010 },
  { clerkId: "demo_extra_5",  email: "noah.kim@demo.rallybase",       name: "Noah Kim",       rating: 1040 },
  { clerkId: "demo_extra_6",  email: "zara.hassan@demo.rallybase",    name: "Zara Hassan",    rating: 1070 },
  { clerkId: "demo_extra_7",  email: "lucas.martin@demo.rallybase",   name: "Lucas Martin",   rating: 1100 },
  { clerkId: "demo_extra_8",  email: "nina.volkov@demo.rallybase",    name: "Nina Volkov",    rating: 1130 },
  { clerkId: "demo_extra_9",  email: "omar.ali@demo.rallybase",       name: "Omar Ali",       rating: 1160 },
  { clerkId: "demo_extra_10", email: "grace.liu@demo.rallybase",      name: "Grace Liu",      rating: 1190 },
  { clerkId: "demo_extra_11", email: "tyler.brooks@demo.rallybase",   name: "Tyler Brooks",   rating: 1220 },
  { clerkId: "demo_extra_12", email: "aisha.wright@demo.rallybase",   name: "Aisha Wright",   rating: 1250 },
  { clerkId: "demo_extra_13", email: "marco.ricci@demo.rallybase",    name: "Marco Ricci",    rating: 1280 },
  { clerkId: "demo_extra_14", email: "hana.sato@demo.rallybase",      name: "Hana Sato",      rating: 1310 },
  { clerkId: "demo_extra_15", email: "david.osei@demo.rallybase",     name: "David Osei",     rating: 1340 },
  { clerkId: "demo_extra_16", email: "elena.popov@demo.rallybase",    name: "Elena Popov",    rating: 1370 },
  { clerkId: "demo_extra_17", email: "james.wu@demo.rallybase",       name: "James Wu",       rating: 1400 },
  { clerkId: "demo_extra_18", email: "fatima.ndiaye@demo.rallybase",  name: "Fatima Ndiaye",  rating: 1420 },
  { clerkId: "demo_extra_19", email: "ben.torres@demo.rallybase",     name: "Ben Torres",     rating: 1440 },
  { clerkId: "demo_extra_20", email: "yuna.lee@demo.rallybase",       name: "Yuna Lee",       rating: 1460 },
  { clerkId: "demo_extra_21", email: "alex.burns@demo.rallybase",     name: "Alex Burns",     rating: 1480 },
  { clerkId: "demo_extra_22", email: "priya.sharma@demo.rallybase",   name: "Priya Sharma",   rating: 1500 },
  { clerkId: "demo_extra_23", email: "daniel.ng@demo.rallybase",      name: "Daniel Ng",      rating: 1520 },
  { clerkId: "demo_extra_24", email: "mia.rodriguez@demo.rallybase",  name: "Mia Rodriguez",  rating: 1550 },
];

async function main() {
  const usattCat = await prisma.ratingCategory.findFirst({
    where: { name: "RallyBase Singles" },
  });
  if (!usattCat) {
    console.error("RallyBase Singles rating category not found. Run npm run db:seed first.");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const p of EXTRA_PLAYERS) {
    const existing = await prisma.user.findUnique({ where: { clerkId: p.clerkId } });
    if (existing) {
      skipped++;
      continue;
    }

    const user = await prisma.user.create({
      data: { clerkId: p.clerkId, email: p.email, name: p.name },
    });

    const profile = await prisma.playerProfile.create({
      data: { userId: user.id, displayName: p.name },
    });

    await prisma.playerRating.create({
      data: {
        playerProfileId: profile.id,
        ratingCategoryId: usattCat.id,
        rating: p.rating,
        gamesPlayed: 0,
      },
    });

    created++;
  }

  console.log(`Done. Created ${created} players, skipped ${skipped} already-existing.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
