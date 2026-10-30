import type { CashEntry, CashListRow, CreateCashEntryRequest } from "@erp/shared";
import { directionOf, requiresCounterparty } from "../domain/cash-category.js";
import { signedAmount, type CashRecord, type Counterparty } from "../domain/cash.js";
import { formatDocumentNumber } from "../domain/document-number.js";
import { CategoryDirectionMismatchError, CounterpartyRequiredError, NotFoundError } from "../domain/errors.js";
import type { CashEntryRepository, CounterpartyRepository } from "./ports/cash-repositories.js";
import type { SequenceCounter } from "./ports/sequence-counter.js";

const MANUAL_ENTRY_PREFIX = "KAS";

const toEntry = (record: CashRecord, counterparties: Map<string, Counterparty>): CashEntry => ({
  ...record,
  counterpartyName: (record.counterpartyId && counterparties.get(record.counterpartyId)?.name) || null,
});

export function makeCashUseCases(deps: {
  cash: CashEntryRepository;
  counterparties: CounterpartyRepository;
  sequence: SequenceCounter;
}) {
  const counterpartiesById = async () => new Map((await deps.counterparties.list()).map((c) => [c.id, c]));

  return {
    async recordManualEntry(request: CreateCashEntryRequest): Promise<CashEntry> {
      if (directionOf(request.category) !== request.direction) throw new CategoryDirectionMismatchError();
      const counterpartyId = request.counterpartyId || null;
      if (!counterpartyId && requiresCounterparty(request.category)) throw new CounterpartyRequiredError();
      const counterparty = counterpartyId ? await deps.counterparties.findById(counterpartyId) : null;
      if (counterpartyId && !counterparty) throw new NotFoundError("Counterparty");

      const number = formatDocumentNumber(MANUAL_ENTRY_PREFIX, await deps.sequence.next(MANUAL_ENTRY_PREFIX));
      const record = await deps.cash.create({
        number,
        direction: request.direction,
        category: request.category,
        amount: request.amount,
        date: request.date,
        counterpartyId,
        note: request.note ?? "",
        source: null,
      });
      return { ...record, counterpartyName: counterparty?.name ?? null };
    },

    async list(): Promise<CashListRow[]> {
      const [records, counterparties] = await Promise.all([deps.cash.list(), counterpartiesById()]);
      let balance = 0;
      return records.map((record) => {
        balance += signedAmount(record);
        return { ...toEntry(record, counterparties), balance };
      });
    },
  };
}
export type CashUseCases = ReturnType<typeof makeCashUseCases>;
