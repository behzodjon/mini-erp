import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeMongoUnitOfWork } from "../src/infrastructure/mongo/mongo-unit-of-work.js";

describe("unit of work on a replica set", () => {
  let replSet: MongoMemoryReplSet;
  let client: MongoClient;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    client = await MongoClient.connect(replSet.getUri());
    // Collections must exist before they are used inside a transaction.
    await client.db("t").createCollection("a");
    await client.db("t").createCollection("b");
  });
  afterAll(async () => {
    await client.close();
    await replSet.stop();
  });

  it("commits writes to several collections together", async () => {
    const uow = makeMongoUnitOfWork(client);
    await uow.run(async ({ session }) => {
      await client.db("t").collection("a").insertOne({ n: 1 }, { session });
      await client.db("t").collection("b").insertOne({ n: 2 }, { session });
    });
    expect(await client.db("t").collection("a").countDocuments({ n: 1 })).toBe(1);
    expect(await client.db("t").collection("b").countDocuments({ n: 2 })).toBe(1);
  });

  it("rolls everything back when the block fails", async () => {
    const uow = makeMongoUnitOfWork(client);
    await expect(
      uow.run(async ({ session }) => {
        await client.db("t").collection("a").insertOne({ n: 99 }, { session });
        await client.db("t").collection("b").insertOne({ n: 99 }, { session });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await client.db("t").collection("a").countDocuments({ n: 99 })).toBe(0);
    expect(await client.db("t").collection("b").countDocuments({ n: 99 })).toBe(0);
  });
});
