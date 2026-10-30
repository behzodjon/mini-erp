import { InvalidCredentialsError } from "../domain/errors.js";
import type { Owner } from "../domain/owner.js";
import type { PasswordHasher } from "./ports/password-hasher.js";

export type OwnerCredentials = { username: string; passwordHash: string };

export function makeLogin(deps: { owner: OwnerCredentials; hasher: PasswordHasher }) {
  return async function login(username: string, password: string): Promise<Owner> {
    const usernameMatches = username === deps.owner.username;
    // Always verify, so a wrong username costs the same time as a wrong password.
    const passwordMatches = await deps.hasher.verify(password, deps.owner.passwordHash);
    if (!usernameMatches || !passwordMatches) throw new InvalidCredentialsError();
    return { username: deps.owner.username };
  };
}
