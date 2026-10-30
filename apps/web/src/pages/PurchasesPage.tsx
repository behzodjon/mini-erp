import type { Product, Purchase, QuantityUnit, SavePurchaseRequest } from "@erp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api";
import { flattenWarehouses, som } from "../lib";

const PURCHASES_KEY = ["purchases"] as const;
const today = () => new Date().toISOString().slice(0, 10);

type LineDraft = { productId: string; warehouseId: string; unit: QuantityUnit; quantity: string; unitPrice: string };
type Editing = { kind: "new" } | { kind: "purchase"; purchase: Purchase };

export function PurchasesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const purchases = useQuery({ queryKey: PURCHASES_KEY, queryFn: api.listPurchases });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: PURCHASES_KEY });
    // Executing moves stock, cost and cash, so everything derived from them is stale too.
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-report"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-by-warehouse"] });
    void queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
  };

  const execute = useMutation({ mutationFn: api.executePurchase, onSuccess: refresh });
  const remove = useMutation({ mutationFn: api.deletePurchase, onSuccess: refresh });

  function confirmExecute(p: Purchase) {
    const cash = p.openingBalance ? "Boshlang'ich qoldiq: kassadan pul chiqmaydi." : `Kassadan ${som.format(p.total)} so'm chiqim yoziladi.`;
    if (window.confirm(`${p.number} bajarilsinmi? Tovar omborga kiradi. ${cash} Keyin o'zgartirib bo'lmaydi.`)) execute.mutate(p.id);
  }

  return (
    <section>
      <h2>Xaridlar</h2>
      <div className="toolbar">
        <button onClick={() => setEditing({ kind: "new" })}>Yangi xarid</button>
      </div>

      {editing && (
        <PurchaseForm
          key={editing.kind === "purchase" ? editing.purchase.id : "new"}
          purchase={editing.kind === "purchase" ? editing.purchase : null}
          onDone={() => {
            setEditing(null);
            refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {(execute.isError || remove.isError) && (
        <p role="alert" className="error">
          Amalni bajarib bo'lmadi. Xarid allaqachon bajarilgan bo'lishi mumkin; ro'yxatni yangilab ko'ring.
        </p>
      )}
      {purchases.isPending && <p className="muted">Yuklanmoqda…</p>}
      {purchases.isError && <p className="error">Xaridlarni yuklab bo'lmadi.</p>}
      {purchases.data && (
        <table className="data">
          <thead>
            <tr>
              <th>Raqam</th>
              <th>Sana</th>
              <th>Holati</th>
              <th className="num">Jami (so'm)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {purchases.data.map((p) => (
              <tr key={p.id}>
                <td>{p.number}</td>
                <td>{p.date}</td>
                <td className={`status-${p.status}`}>
                  {p.status === "draft" ? "Qoralama" : "Bajarilgan"}
                  {p.openingBalance ? " (boshlang'ich qoldiq)" : ""}
                </td>
                <td className="num">{som.format(p.total)}</td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => setEditing({ kind: "purchase", purchase: p })}>
                    {p.status === "draft" ? "Tahrirlash" : "Ko'rish"}
                  </button>
                  {p.status === "draft" && (
                    <>
                      <button onClick={() => confirmExecute(p)} disabled={execute.isPending}>
                        Bajarish
                      </button>
                      <button
                        className="secondary"
                        disabled={remove.isPending}
                        onClick={() => window.confirm(`${p.number} qoralamasi o'chirilsinmi?`) && remove.mutate(p.id)}
                      >
                        O'chirish
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {purchases.data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Hali xarid yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

const emptyLine = (warehouseId: string): LineDraft => ({ productId: "", warehouseId, unit: "piece", quantity: "", unitPrice: "" });

function PurchaseForm({ purchase, onDone, onCancel }: { purchase: Purchase | null; onDone: () => void; onCancel: () => void }) {
  const readOnly = purchase?.status === "executed";
  const [date, setDate] = useState(purchase?.date ?? today());
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(purchase?.defaultWarehouseId ?? "");
  const [openingBalance, setOpeningBalance] = useState(purchase?.openingBalance ?? false);
  const [note, setNote] = useState(purchase?.note ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    purchase
      ? purchase.lines.map((l) => ({
          productId: l.productId,
          warehouseId: l.warehouseId,
          unit: l.unit,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
        }))
      : [emptyLine("")],
  );

  // An executed purchase may mention archived products, so the read-only view lists them too.
  const products = useQuery({ queryKey: ["products", "", readOnly], queryFn: () => api.listProducts({ search: "", includeArchived: readOnly }) });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouseTree });
  const warehouseOptions = flattenWarehouses(warehouses.data ?? []);
  const productById = new Map((products.data ?? []).map((p) => [p.id, p] as const));

  const save = useMutation({
    mutationFn: () => {
      const body: SavePurchaseRequest = {
        date,
        defaultWarehouseId: defaultWarehouseId || null,
        openingBalance,
        note,
        lines: lines.map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      };
      return purchase ? api.updatePurchase(purchase.id, body) : api.createPurchase(body);
    },
    onSuccess: onDone,
  });

  const changeLine = (index: number, changes: Partial<LineDraft>) =>
    setLines((all) => all.map((l, i) => (i === index ? { ...l, ...changes } : l)));
  const lineTotal = (l: LineDraft) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <label>
        Sana
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={readOnly} />
      </label>
      <label>
        Ombor (yangi qatorlar uchun)
        <select
          value={defaultWarehouseId}
          disabled={readOnly}
          onChange={(e) => {
            setDefaultWarehouseId(e.target.value);
            // Rows that still have no location take it, so the owner usually picks the warehouse once.
            setLines((all) => all.map((l) => (l.warehouseId ? l : { ...l, warehouseId: e.target.value })));
          }}
        >
          <option value="">—</option>
          {warehouseOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={openingBalance} onChange={(e) => setOpeningBalance(e.target.checked)} disabled={readOnly} />
        Boshlang'ich qoldiq (kassadan pul chiqmaydi)
      </label>
      <label>
        Izoh
        <input value={note} onChange={(e) => setNote(e.target.value)} disabled={readOnly} />
      </label>

      <div className="lines">
        <table className="data">
          <thead>
            <tr>
              <th>Mahsulot</th>
              <th>Ombor</th>
              <th>Birlik</th>
              <th className="num">Miqdor</th>
              <th className="num">Narx (so'm)</th>
              <th className="num">Summa (so'm)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select value={l.productId} onChange={(e) => changeLine(i, { productId: e.target.value })} required disabled={readOnly}>
                    <option value="">—</option>
                    {(products.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select value={l.warehouseId} onChange={(e) => changeLine(i, { warehouseId: e.target.value })} required disabled={readOnly}>
                    <option value="">—</option>
                    {warehouseOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select value={l.unit} onChange={(e) => changeLine(i, { unit: e.target.value as QuantityUnit })} disabled={readOnly}>
                    <option value="piece">dona</option>
                    <option value="block">blok</option>
                  </select>
                </td>
                <td className="num-input">
                  <input type="number" min={1} step={1} value={l.quantity} onChange={(e) => changeLine(i, { quantity: e.target.value })} required disabled={readOnly} />
                  <PiecesHint line={l} product={productById.get(l.productId)} />
                </td>
                <td className="num-input">
                  <input type="number" min={0} step={1} value={l.unitPrice} onChange={(e) => changeLine(i, { unitPrice: e.target.value })} required disabled={readOnly} />
                  <span className="muted">{l.unit === "block" ? "1 blok narxi" : "1 dona narxi"}</span>
                </td>
                <td className="num">{som.format(lineTotal(l))}</td>
                <td>
                  {!readOnly && lines.length > 1 && (
                    <button type="button" className="secondary" onClick={() => setLines((all) => all.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly && (
          <button type="button" className="secondary" onClick={() => setLines((all) => [...all, emptyLine(defaultWarehouseId)])}>
            + Qator qo'shish
          </button>
        )}
      </div>

      <p className="purchase-total">Jami: {som.format(total)} so'm</p>
      <div className="actions">
        {!readOnly && (
          <button type="submit" disabled={save.isPending}>
            Saqlash
          </button>
        )}
        <button type="button" className="secondary" onClick={onCancel}>
          {readOnly ? "Yopish" : "Bekor qilish"}
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

/** Shows what a block line comes to in pieces, so the owner can check it against the invoice. */
function PiecesHint({ line, product }: { line: LineDraft; product: Product | undefined }) {
  const quantity = Number(line.quantity);
  if (line.unit !== "block" || !product || !quantity) return null;
  return <span className="muted">= {som.format(quantity * product.piecesPerBlock)} dona</span>;
}
