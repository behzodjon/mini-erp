import type { SalesFigures } from "@erp/shared";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { formatBlocks, shopToday, som } from "../lib";

/** The first day of the month containing `day` (YYYY-MM-DD). */
const monthStart = (day: string) => `${day.slice(0, 8)}01`;

export function SalesReport() {
  const [from, setFrom] = useState(() => monthStart(shopToday()));
  const [to, setTo] = useState(shopToday);
  const validRange = from !== "" && to !== "" && from <= to;
  const report = useQuery({ queryKey: ["sales-report", from, to], queryFn: () => api.salesReport(from, to), enabled: validRange });

  return (
    <>
      <h3>Savdo</h3>
      <div className="toolbar">
        <label>
          Boshlanish sanasi
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Tugash sanasi
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {!validRange && <p className="error">Sana oralig'ini to'g'ri tanlang.</p>}
      {validRange && report.isPending && <p className="muted">Yuklanmoqda…</p>}
      {validRange && report.isError && <p className="error">Hisobotni yuklab bo'lmadi.</p>}
      {validRange && report.data && (
        <>
          <ReportTable columns={["Savdolar soni", ...FIGURE_COLUMNS]} numeric={[true, true, true, true]} empty="">
            <tr>
              <td className="num">{som.format(report.data.summary.count)}</td>
              <FiguresCells figures={report.data.summary} />
            </tr>
          </ReportTable>

          <h4>Mahsulotlar bo'yicha</h4>
          <ReportTable
            columns={["Mahsulot", "Sotilgan (dona)", "Blok + dona", ...FIGURE_COLUMNS]}
            numeric={[false, true, true, true, true, true]}
            empty={report.data.products.length === 0 ? EMPTY : ""}
          >
            {report.data.products.map((row) => (
              <tr key={row.productId}>
                <td>{row.productName}</td>
                <td className="num">{som.format(row.pieces)}</td>
                <td className="num">{formatBlocks(row)}</td>
                <FiguresCells figures={row} />
              </tr>
            ))}
          </ReportTable>

          <h4>Bajarilgan savdolar</h4>
          <ReportTable
            columns={["Raqam", "Bajarilgan sana", ...FIGURE_COLUMNS]}
            numeric={[false, false, true, true, true]}
            empty={report.data.sales.length === 0 ? EMPTY : ""}
          >
            {report.data.sales.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`/savdolar/${s.id}`}>{s.number}</Link>
                </td>
                <td>{s.executedOn}</td>
                <FiguresCells figures={s} />
              </tr>
            ))}
          </ReportTable>
        </>
      )}
    </>
  );
}

const EMPTY = "Bu oraliqda savdo yo'q.";
const FIGURE_COLUMNS = ["Tushum (so'm)", "Tannarx (so'm)", "Yalpi foyda (so'm)"];

/** A report table; a non-empty `empty` shows that text in place of rows. */
function ReportTable({ columns, numeric, empty, children }: { columns: string[]; numeric: boolean[]; empty: string; children: ReactNode }) {
  return (
    <table className="data">
      <thead>
        <tr>
          {columns.map((label, i) => (
            <th key={label} className={numeric[i] ? "num" : undefined}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {children}
        {empty !== "" && (
          <tr>
            <td colSpan={columns.length} className="muted">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function FiguresCells({ figures }: { figures: SalesFigures }) {
  return (
    <>
      <td className="num">{som.format(figures.revenue)}</td>
      <td className="num">{som.format(figures.costOfGoodsSold)}</td>
      <td className="num">{som.format(figures.grossProfit)}</td>
    </>
  );
}
