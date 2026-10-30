import { z } from "zod";

export type AppConfig = {
  port: number;
  mongodbUri: string;
  mongodbDb: string;
  ownerUsername: string;
  ownerPasswordHash: string;
  sessionSecret: string;
  /** Mark the session cookie `Secure` (true in production behind HTTPS). */
  secureCookies: boolean;
};

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("beverage_shop"),
  OWNER_USERNAME: z.string().min(1),
  OWNER_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NODE_ENV: z.string().optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const e = envSchema.parse(env);
  return {
    port: e.PORT,
    mongodbUri: e.MONGODB_URI,
    mongodbDb: e.MONGODB_DB,
    ownerUsername: e.OWNER_USERNAME,
    ownerPasswordHash: e.OWNER_PASSWORD_HASH,
    sessionSecret: e.SESSION_SECRET,
    secureCookies: e.NODE_ENV === "production",
  };
}
