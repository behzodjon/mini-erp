/**
 * Runs a block atomically. Everything the block does through repositories that were created
 * for this transaction commits together or not at all. Repository ports added by later tickets
 * receive the transaction context so use cases never touch MongoDB directly.
 */
export interface UnitOfWork<Tx = unknown> {
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
