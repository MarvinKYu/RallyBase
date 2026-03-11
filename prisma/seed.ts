import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Roles
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  console.log(`Seeded ${roles.length} roles`);

  // Organizations
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

  // Disciplines
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

  // Rating categories
  await prisma.ratingCategory.upsert({
    where: { organizationId_disciplineId: { organizationId: usatt.id, disciplineId: usattSingles.id } },
    update: {},
    create: { organizationId: usatt.id, disciplineId: usattSingles.id, name: "USATT Singles" },
  });

  await prisma.ratingCategory.upsert({
    where: { organizationId_disciplineId: { organizationId: nctta.id, disciplineId: ncttaSingles.id } },
    update: {},
    create: { organizationId: nctta.id, disciplineId: ncttaSingles.id, name: "NCTTA Singles" },
  });

  console.log("Seeded organizations, disciplines, and rating categories");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
