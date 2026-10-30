export interface PasswordHasher {
  verify(plain: string, hash: string): Promise<boolean>;
}
