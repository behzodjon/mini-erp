import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../application/ports/password-hasher.js";

export const bcryptPasswordHasher: PasswordHasher = {
  verify: (plain, hash) => bcrypt.compare(plain, hash),
};
