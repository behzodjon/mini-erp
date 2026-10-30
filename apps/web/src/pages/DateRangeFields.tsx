import { useState } from "react";
import { shopToday } from "../lib";

/** The first day of the month containing `day` (YYYY-MM-DD). */
const monthStart = (day: string) => `${day.slice(0, 8)}01`;

/** A from/to day range for a report; it starts as the month so far, and `valid` says whether it can be queried. */
export function useDateRange() {
  const [from, setFrom] = useState(() => monthStart(shopToday()));
  const [to, setTo] = useState(shopToday);
  return { from, to, setFrom, setTo, valid: from !== "" && to !== "" && from <= to };
}

export function DateRangeFields({ range }: { range: ReturnType<typeof useDateRange> }) {
  return (
    <>
      <div className="toolbar">
        <label>
          Boshlanish sanasi
          <input type="date" value={range.from} onChange={(e) => range.setFrom(e.target.value)} />
        </label>
        <label>
          Tugash sanasi
          <input type="date" value={range.to} onChange={(e) => range.setTo(e.target.value)} />
        </label>
      </div>
      {!range.valid && <p className="error">Sana oralig'ini to'g'ri tanlang.</p>}
    </>
  );
}
