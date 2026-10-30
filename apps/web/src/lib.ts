import type { WarehouseNode } from "@erp/shared";

export const som = new Intl.NumberFormat("uz-UZ");

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
