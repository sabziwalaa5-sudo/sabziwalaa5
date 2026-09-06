import { ensureDatabaseSeeded } from "../src/lib/server/bootstrap";

async function main() {
  await ensureDatabaseSeeded();
  console.log("Database seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db");
    await prisma.$disconnect();
  });
