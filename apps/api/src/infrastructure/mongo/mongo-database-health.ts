import type { Db } from "mongodb";
import type { DatabaseHealth } from "../../application/ports/database-health.js";

export function makeMongoDatabaseHealth(db: Db): DatabaseHealth {
  return {
    async isUp() {
      try {
        await db.command({ ping: 1 });
        return true;
      } catch {
        return false;
      }
    },
  };
}
