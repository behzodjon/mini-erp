import type { FastifyReply, FastifyRequest } from "fastify";
import type { Owner } from "../domain/owner.js";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function startSession(reply: FastifyReply, owner: Owner, secure: boolean): void {
  reply.setCookie(COOKIE_NAME, owner.username, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    signed: true,
  });
}

export function endSession(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Returns the logged-in owner's username, or null when the cookie is missing or tampered with. */
export function readSession(request: FastifyRequest): Owner | null {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return null;
  const { valid, value } = request.unsignCookie(raw);
  return valid && value ? { username: value } : null;
}
