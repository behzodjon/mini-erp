import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { LightMyRequestResponse } from "fastify";
import { createApp, type App } from "../../src/composition-root.js";

export const OWNER = { username: "owner", password: "correct-horse" };

export type TestApp = {
  app: App;
  /** Logs in as the owner and returns the session cookie header value. */
  loginAsOwner(): Promise<string>;
  stop(): Promise<void>;
};

/** Builds the real app in-process against a throwaway single-node replica set (transactions work). */
export async function startTestApp(options: { webRoot?: string } = {}): Promise<TestApp> {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const app = await createApp({
    port: 0,
    mongodbUri: replSet.getUri(),
    mongodbDb: "test",
    ownerUsername: OWNER.username,
    ownerPasswordHash: bcrypt.hashSync(OWNER.password, 4),
    sessionSecret: "test-secret-test-secret-test-secret-1234",
    secureCookies: false,
    webRoot: options.webRoot,
  });

  return {
    app,
    async loginAsOwner() {
      const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: OWNER });
      return sessionCookie(res);
    },
    async stop() {
      await app.close();
      await replSet.stop();
    },
  };
}

export function sessionCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies[0];
  if (!cookie) throw new Error("response set no cookie");
  return `${cookie.name}=${cookie.value}`;
}
