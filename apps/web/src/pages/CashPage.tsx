import {
  manualInflowCategories,
  manualOutflowCategories,
  type CashCategory,
  type CashDirection,
  type ManualCashCategory,
} from "@erp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api";
import { CATEGORY_LABEL } from "../lib";

const CASH_KEY = ["cash-entries"] as const;
const COUNTERPARTIES_KEY = ["counterparties"] as const;
const som = new Intl.NumberFormat("uz-UZ");

const LOAN_CATEGORIES: readonly CashCategory[] = ["loan_received", "loan_repayment_received", "loan_given", "loan_repayment_paid"];
const CATEGORIES_FOR: Record<CashDirection, readonly ManualCashCategory[]> = {
  in: manualInflowCategories,
  out: manualOutflowCategories,
};

const today = () => new Date().toISOString().slice(0, 10);

export function CashPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const entries = useQuery({ queryKey: CASH_KEY, queryFn: api.listCashEntries });

  return (
    <section>
      <h2>Kassa</h2>
      <div className="toolbar">
        <button onClick={() => setAdding(true)}>Yangi yozuv</button>
      </div>

      {adding && (
        <CashEntryForm
          onDone={() => {
            setAdding(false);
            void queryClient.invalidateQueries({ queryKey: CASH_KEY });
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {entries.isPending && <p className="muted">Yuklanmoqda…</p>}
      {entries.isError && <p className="error">Kassani yuklab bo'lmadi.</p>}
      {entries.data && (
        <table className="data">
          <thead>
            <tr>
              <th>Sana</th>
              <th>Raqam</th>
              <th>Turi</th>
              <th>Kontragent</th>
              <th>Izoh</th>
              <th className="num">Kirim (so'm)</th>
              <th className="num">Chiqim (so'm)</th>
              <th className="num">Qoldiq (so'm)</th>
            </tr>
          </thead>
          <tbody>
            {entries.data.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td>{e.number ?? e.source?.number ?? "—"}</td>
                <td>{CATEGORY_LABEL[e.category]}</td>
                <td>{e.counterpartyName ?? "—"}</td>
                <td>{e.note}</td>
                <td className="num">{e.direction === "in" ? som.format(e.amount) : ""}</td>
                <td className="num">{e.direction === "out" ? som.format(e.amount) : ""}</td>
                <td className={e.balance < 0 ? "num negative" : "num"}>{som.format(e.balance)}</td>
              </tr>
            ))}
            {entries.data.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Hali yozuv yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function CashEntryForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<CashDirection>("in");
  const [category, setCategory] = useState<ManualCashCategory>(manualInflowCategories[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingCounterparty, setCreatingCounterparty] = useState(false);

  const counterparties = useQuery({ queryKey: COUNTERPARTIES_KEY, queryFn: api.listCounterparties });
  const needsCounterparty = LOAN_CATEGORIES.includes(category);

  const save = useMutation({
    mutationFn: async () => {
      let chosenId = counterpartyId;
      if (creatingCounterparty) {
        const created = await api.createCounterparty({ name: newName, phone: newPhone });
        void queryClient.invalidateQueries({ queryKey: COUNTERPARTIES_KEY });
        // If the entry is refused below, a retry must pick this counterparty instead of creating another.
        setCounterpartyId(created.id);
        setCreatingCounterparty(false);
        chosenId = created.id;
      }
      return api.createCashEntry({
        direction,
        category,
        amount: Number(amount),
        date,
        counterpartyId: chosenId || null,
        note,
      });
    },
    onSuccess: onDone,
  });

  function changeDirection(next: CashDirection) {
    setDirection(next);
    setCategory(CATEGORIES_FOR[next][0]!);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <label>
        Yo'nalish
        <select value={direction} onChange={(e) => changeDirection(e.target.value as CashDirection)}>
          <option value="in">Kirim</option>
          <option value="out">Chiqim</option>
        </select>
      </label>
      <label>
        Turi
        <select value={category} onChange={(e) => setCategory(e.target.value as ManualCashCategory)}>
          {CATEGORIES_FOR[direction].map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Summa (so'm)
        <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <label>
        Sana
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {creatingCounterparty ? (
        <>
          <label>
            Yangi kontragent nomi
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </label>
          <label>
            Telefon
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </label>
        </>
      ) : (
        <label>
          Kontragent{needsCounterparty ? " (majburiy)" : ""}
          <select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)} required={needsCounterparty}>
            <option value="">—</option>
            {counterparties.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` (${c.phone})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={creatingCounterparty} onChange={(e) => setCreatingCounterparty(e.target.checked)} />
        Yangi kontragent yaratish
      </label>

      <label className="full">
        Izoh
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="actions">
        <button type="submit" disabled={save.isPending}>
          Saqlash
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Bekor qilish
        </button>
      </div>
      {save.isError && (
        <p role="alert" className="error full">
          Saqlab bo'lmadi. Ma'lumotlarni tekshirib, qayta urinib ko'ring.
        </p>
      )}
    </form>
  );
}
