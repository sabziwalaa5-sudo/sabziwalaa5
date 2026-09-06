import { ensureDatabaseReady, ensurePlatformSettings, seedDemoCatalogIfEnabled } from "../src/lib/server/bootstrap";

async function main() {
  await ensurePlatformSettings();

  const demo = process.env.SEED_DEMO_DATA === "1" || process.env.NODE_ENV !== "production";
  if (demo) {
    await seedDemoCatalogIfEnabled();
    console.log("Database initialized with demo catalog (development/demo mode).");
  } else {
    console.log("Production seed: platform settings only. Set SEED_DEMO_DATA=1 to load demo catalog.");
  }
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
