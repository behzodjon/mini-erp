import type { StockByProductRow, StockByWarehouseNode, StockProductLine } from "@erp/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";
import { formatBlocks, som } from "../lib";

type StockView = "product" | "warehouse";

export function ReportsPage() {
  const [view, setView] = useState<StockView>("product");
  return (
    <section>
      <h2>Hisobotlar</h2>
      <h3>Qoldiq</h3>
      <div className="toolbar">
        <button className={view === "product" ? "" : "secondary"} aria-pressed={view === "product"} onClick={() => setView("product")}>
          Mahsulot bo'yicha
        </button>
        <button className={view === "warehouse" ? "" : "secondary"} aria-pressed={view === "warehouse"} onClick={() => setView("warehouse")}>
          Ombor bo'yicha
        </button>
      </div>
      {view === "product" ? <StockByProduct /> : <StockByWarehouse />}
    </section>
  );
}

/** Expanded/collapsed ids, with a toggle. */
function useOpenSet() {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return { open, toggle };
}

function StockByProduct() {
  const report = useQuery({ queryKey: ["stock-report"], queryFn: api.stockByProduct });
  const { open, toggle } = useOpenSet();

  return (
    <>
      {report.isPending && <p className="muted">Yuklanmoqda…</p>}
      {report.isError && <p className="error">Hisobotni yuklab bo'lmadi.</p>}
      {report.data && (
        <table className="data">
          <thead>
            <tr>
              <th>Mahsulot</th>
              <th className="num">Jami (dona)</th>
              <th className="num">Blok + dona</th>
              <th className="num">O'rtacha tannarx (so'm)</th>
              <th className="num">Qiymati (so'm)</th>
            </tr>
          </thead>
          <tbody>
            {report.data.map((row) => (
              <StockRows key={row.productId} row={row} expanded={open.has(row.productId)} onToggle={() => toggle(row.productId)} />
            ))}
            {report.data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Hali mahsulot yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

function StockRows({ row, expanded, onToggle }: { row: StockByProductRow; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr>
        <td>
          <button className="secondary" onClick={onToggle} aria-expanded={expanded} disabled={row.locations.length === 0}>
            {expanded ? "▾" : "▸"}
          </button>{" "}
          {row.productName}
        </td>
        <td className="num">{som.format(row.pieces)}</td>
        <td className="num">{formatBlocks(row)}</td>
        <td className="num">{som.format(row.averageCost)}</td>
        <td className="num">{som.format(row.value)}</td>
      </tr>
      {expanded &&
        row.locations.map((l) => (
          <tr key={l.warehouseId} className="sub-row">
            <td>{l.warehouseName}</td>
            <td className="num">{som.format(l.pieces)}</td>
            <td className="num">{formatBlocks(l)}</td>
            <td />
            <td />
          </tr>
        ))}
    </>
  );
}

function StockByWarehouse() {
  const report = useQuery({ queryKey: ["stock-by-warehouse"], queryFn: api.stockByWarehouse });
  const { open, toggle } = useOpenSet();

  return (
    <>
      {report.isPending && <p className="muted">Yuklanmoqda…</p>}
      {report.isError && <p className="error">Hisobotni yuklab bo'lmadi.</p>}
      {report.data && (
        <table className="data">
          <thead>
            <tr>
              <th>Ombor / mahsulot</th>
              <th className="num">Jami (dona)</th>
              <th className="num">Blok + dona</th>
              <th className="num">Qiymati (so'm)</th>
            </tr>
          </thead>
          <tbody>
            {report.data.map((node) => (
              <WarehouseRows key={node.warehouseId} node={node} depth={0} open={open} onToggle={toggle} />
            ))}
            {report.data.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Hali ombor yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

const INDENT = 20;

/**
 * A node row carries the totals of its whole subtree. Expanding it lists the products it holds itself,
 * then (for a parent) the per-product totals of the whole subtree, then its children.
 */
function WarehouseRows({ node, depth, open, onToggle }: { node: StockByWarehouseNode; depth: number; open: ReadonlySet<string>; onToggle: (id: string) => void }) {
  const expanded = open.has(node.warehouseId);
  const expandable = node.own.length > 0 || node.children.length > 0;

  return (
    <>
      <tr>
        <td style={{ paddingLeft: depth * INDENT + 8 }}>
          <button className="secondary" onClick={() => onToggle(node.warehouseId)} aria-expanded={expanded} disabled={!expandable}>
            {expanded ? "▾" : "▸"}
          </button>{" "}
          <strong>{node.name}</strong>
        </td>
        <td className="num">{som.format(node.totalPieces)}</td>
        <td />
        <td className="num">{som.format(node.totalValue)}</td>
      </tr>
      {expanded && (
        <>
          {node.own.map((l) => (
            <ProductLineRow key={l.productId} line={l} depth={depth + 1} />
          ))}
          {node.children.length > 0 && node.rolledUp.length > 0 && (
            <>
              <tr className="sub-row">
                <td colSpan={4} className="muted" style={{ paddingLeft: (depth + 1) * INDENT + 8 }}>
                  Ichki omborlar bilan jami:
                </td>
              </tr>
              {node.rolledUp.map((l) => (
                <ProductLineRow key={l.productId} line={l} depth={depth + 1} />
              ))}
            </>
          )}
          {node.children.map((child) => (
            <WarehouseRows key={child.warehouseId} node={child} depth={depth + 1} open={open} onToggle={onToggle} />
          ))}
        </>
      )}
    </>
  );
}

function ProductLineRow({ line, depth }: { line: StockProductLine; depth: number }) {
  return (
    <tr className="sub-row">
      <td style={{ paddingLeft: depth * INDENT + 8 }}>{line.productName}</td>
      <td className="num">{som.format(line.pieces)}</td>
      <td className="num">{formatBlocks(line)}</td>
      <td className="num">{som.format(line.value)}</td>
    </tr>
  );
}
