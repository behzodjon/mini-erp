import type { DebtBalance } from "@erp/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { CATEGORY_LABEL, som } from "../lib";
import { DateRangeFields, useDateRange } from "./DateRangeFields";

export function PnlReport() {
  const range = useDateRange();
  const { from, to, valid } = range;
  const pnl = useQuery({ queryKey: ["pnl-report", from, to], queryFn: () => api.pnlReport(from, to), enabled: valid });

  return (
    <>
      <h3>Foyda va zarar</h3>
      <DateRangeFields range={range} />
      {valid && pnl.isPending && <p className="muted">Yuklanmoqda…</p>}
      {valid && pnl.isError && <p className="error">Hisobotni yuklab bo'lmadi.</p>}
      {valid && pnl.data && (
        <table className="data">
          <tbody>
            <PnlRow label="Tushum (bajarilgan savdolar)" amount={pnl.data.revenue} />
            <PnlRow label="− Sotilgan tovar tannarxi" amount={pnl.data.costOfGoodsSold} />
            <PnlRow label="= Yalpi foyda" amount={pnl.data.grossProfit} strong />
            {pnl.data.expenses.map((e) => (
              <PnlRow key={e.category} label={`− ${CATEGORY_LABEL[e.category]}`} amount={e.amount} />
            ))}
            <PnlRow label="± Inventarizatsiya natijasi (o'rtacha tannarxda)" amount={pnl.data.stockCountResult} />
            <PnlRow label="+ Boshqa daromad" amount={pnl.data.otherIncome} />
            <PnlRow label="= Sof foyda" amount={pnl.data.netProfit} strong />
          </tbody>
        </table>
      )}
      <p className="muted">Qarzlar, qarz qaytarishlar va egasining kiritgan/yechib olgan puli foyda emas, shuning uchun bu hisobotga kirmaydi. Ular faqat kassa va qarzlarda ko'rinadi.</p>

      <CashAndDebtsPanel />
    </>
  );
}

function PnlRow({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <tr className={strong ? "total" : undefined}>
      <td>{strong ? <strong>{label}</strong> : label}</td>
      <td className={amount < 0 ? "num error" : "num"}>{strong ? <strong>{som.format(amount)}</strong> : som.format(amount)} so'm</td>
    </tr>
  );
}

function CashAndDebtsPanel() {
  const panel = useQuery({ queryKey: ["cash-and-debts"], queryFn: api.cashAndDebts });

  return (
    <>
      <h3>Kassa va qarzlar</h3>
      {panel.isPending && <p className="muted">Yuklanmoqda…</p>}
      {panel.isError && <p className="error">Ma'lumotni yuklab bo'lmadi.</p>}
      {panel.data && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="label">Kassadagi pul</div>
              <div className={panel.data.cashBalance < 0 ? "value negative" : "value"}>{som.format(panel.data.cashBalance)} so'm</div>
            </div>
          </div>
          <DebtTable title="Menga qarzdorlar" empty="Hech kim qarzdor emas." balances={panel.data.owedToMe} />
          <DebtTable title="Men qarzdorman" empty="Hech kimga qarzim yo'q." balances={panel.data.iOwe} />
        </>
      )}
    </>
  );
}

function DebtTable({ title, empty, balances }: { title: string; empty: string; balances: DebtBalance[] }) {
  return (
    <>
      <h4>{title}</h4>
      <table className="data">
        <thead>
          <tr>
            <th>Kontragent</th>
            <th className="num">Summa (so'm)</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((b) => (
            <tr key={b.counterpartyId}>
              <td>{b.counterpartyName}</td>
              <td className="num">{som.format(b.amount)}</td>
            </tr>
          ))}
          {balances.length === 0 && (
            <tr>
              <td colSpan={2} className="muted">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
