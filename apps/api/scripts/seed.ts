import { composeUseCases } from "../src/composition-root.js";
import { loadConfig } from "../src/config.js";
import { SeedRefusedError, seedShop } from "../src/seed-shop.js";

const force = process.argv.includes("--force");
const config = loadConfig(process.env);
const shop = await composeUseCases(config);
try {
  await seedShop(shop, { force });
  console.log(`Seeded database "${config.mongodbDb}".`);
} catch (error) {
  if (!(error instanceof SeedRefusedError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await shop.close();
}
