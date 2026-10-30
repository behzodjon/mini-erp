import { SHOP_TIME_ZONE, type CashCategory, type WarehouseNode } from "@erp/shared";

export const som = new Intl.NumberFormat("uz-UZ");

/** What the owner calls each cash category. */
export const CATEGORY_LABEL: Record<CashCategory, string> = {
  sale: "Savdo",
  purchase: "Xarid",
  loan_received: "Qarz olindi",
  loan_repayment_received: "Berilgan qarz qaytarildi",
  owner_contribution: "Egasi kiritdi / boshlang'ich kassa",
  other_income: "Boshqa daromad",
  loan_given: "Qarz berildi",
  loan_repayment_paid: "Olingan qarz qaytarildi",
  owner_withdrawal: "Egasi yechib oldi",
  travel_cost: "Yo'l kira",
  rent: "Ijara",
  salary: "Oylik",
  other_expense: "Boshqa xarajat",
};

/** Today in the shop's calendar (see SHOP_TIME_ZONE), whatever the browser's time zone is. */
export const shopToday = (): string => new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIME_ZONE }).format(new Date());

/** "2 blok + 6 dona", leaving out the part that is zero. */
export function formatBlocks(q: { blocks: number; remainderPieces: number }): string {
  const parts = [];
  if (q.blocks > 0) parts.push(`${q.blocks} blok`);
  if (q.remainderPieces > 0 || q.blocks === 0) parts.push(`${q.remainderPieces} dona`);
  return parts.join(" + ");
}

/** The warehouse tree as an indented flat list, for pickers. */
export function flattenWarehouses(nodes: WarehouseNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [{ id: n.id, label: `${"— ".repeat(depth)}${n.name}` }, ...flattenWarehouses(n.children, depth + 1)]);
}
