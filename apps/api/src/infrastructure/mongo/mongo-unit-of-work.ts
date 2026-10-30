import type { ClientSession, MongoClient } from "mongodb";
import type { UnitOfWork } from "../../application/ports/unit-of-work.js";

/** Transaction context for Mongo repositories: pass `session` to every driver call. */
export type MongoTx = { session: ClientSession };

export function makeMongoUnitOfWork(client: MongoClient): UnitOfWork<MongoTx> {
  return {
    async run(work) {
      const session = client.startSession();
      try {
        // withTransaction retries on transient errors and commits when the block resolves.
        return await session.withTransaction(() => work({ session }));
      } finally {
        await session.endSession();
      }
    },
  };
}
