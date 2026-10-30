import type { CounterpartyRepository } from "./ports/cash-repositories.js";

export function makeCounterpartyUseCases(deps: { counterparties: CounterpartyRepository }) {
  return {
    create: (details: { name: string; phone?: string }) =>
      deps.counterparties.create({ name: details.name, phone: details.phone || null }),
    list: () => deps.counterparties.list(),
  };
}
export type CounterpartyUseCases = ReturnType<typeof makeCounterpartyUseCases>;
