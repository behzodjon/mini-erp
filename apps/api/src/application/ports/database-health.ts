export interface DatabaseHealth {
  /** Resolves true when the database answers, false when it is unreachable. */
  isUp(): Promise<boolean>;
}
