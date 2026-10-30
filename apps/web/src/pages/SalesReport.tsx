import type { SalesFigures } from "@erp/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
          <table className="data">
            <thead>
              <tr>
                <th className="num">Savdolar soni</th>
                <th className="num">Tushum (so'm)</th>
                <th className="num">Tannarx (so'm)</th>
                <th className="num">Yalpi foyda (so'm)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="num">{som.format(report.data.summary.count)}</td>
                <FiguresCells figures={report.data.summary} />
              </tr>
            </tbody>
          </table>

          <h4>Mahsulotlar bo'yicha</h4>
          <table className="data">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th className="num">Sotilgan (dona)</th>
                <th className="num">Blok + dona</th>
                <th className="num">Tushum (so'm)</th>
                <th className="num">Tannarx (so'm)</th>
                <th className="num">Yalpi foyda (so'm)</th>
              </tr>
            </thead>
            <tbody>
              {report.data.products.map((row) => (
                <tr key={row.productId}>
                  <td>{row.productName}</td>
                  <td className="num">{som.format(row.pieces)}</td>
                  <td className="num">{formatBlocks(row)}</td>
                  <FiguresCells figures={row} />
                </tr>
              ))}
              {report.data.products.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Bu oraliqda savdo yo'q.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h4>Bajarilgan savdolar</h4>
          <table className="data">
            <thead>
              <tr>
                <th>Raqam</th>
                <th>Sana</th>
                <th className="num">Tushum (so'm)</th>
                <th className="num">Tannarx (so'm)</th>
                <th className="num">Yalpi foyda (so'm)</th>
              </tr>
            </thead>
            <tbody>
              {report.data.sales.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/savdolar/${s.id}`}>{s.number}</Link>
                  </td>
                  <td>{s.date}</td>
                  <FiguresCells figures={s} />
                </tr>
              ))}
              {report.data.sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Bu oraliqda savdo yo'q.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </>
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
