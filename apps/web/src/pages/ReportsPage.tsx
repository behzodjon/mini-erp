import type { StockByProductRow } from "@erp/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";
import { formatBlocks, som } from "../lib";

export function ReportsPage() {
  return (
    <section>
      <h2>Hisobotlar</h2>
      <StockReport />
    </section>
  );
}

function StockReport() {
  const report = useQuery({ queryKey: ["stock-report"], queryFn: api.stockByProduct });
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <>
      <h3>Qoldiq</h3>
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
