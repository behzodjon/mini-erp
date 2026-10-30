/** Hands out 1, 2, 3, … per key. Atomic: concurrent callers never get the same number. */
export interface SequenceCounter {
  next(key: string): Promise<number>;
}
