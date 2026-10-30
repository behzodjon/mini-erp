import type { DatabaseHealth } from "./ports/database-health.js";

export type HealthReport = { api: "ok"; database: "ok" | "down" };

export function makeCheckHealth(deps: { database: DatabaseHealth }) {
  return async function checkHealth(): Promise<HealthReport> {
    return { api: "ok", database: (await deps.database.isUp()) ? "ok" : "down" };
  };
}
