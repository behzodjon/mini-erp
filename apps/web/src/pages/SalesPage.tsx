import type { Product, QuantityUnit, Sale, SaveSaleRequest, StockByProductRow, StockShortage } from "@erp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import { flattenWarehouses, som } from "../lib";

const SALES_KEY = ["sales"] as const;
const today = () => new Date().toISOString().slice(0, 10);

type LineDraft = {
  productId: string;
  warehouseId: string;
  unit: QuantityUnit;
  quantity: string;
  unitPrice: string;
  /** Once the owner types a price, picking another product or unit no longer overwrites it. */
  priceEdited: boolean;
};
type Editing = { kind: "new" } | { kind: "sale"; sale: Sale };

const piecesOf = (l: Pick<LineDraft, "unit" | "quantity">, product: Product | undefined) =>
  (Number(l.quantity) || 0) * (l.unit === "block" ? (product?.piecesPerBlock ?? 0) : 1);

/** The product's default price is per piece; a block line is priced per block. */
const defaultPrice = (unit: QuantityUnit, product: Product | undefined) =>
  product ? String(product.defaultSalePrice * (unit === "block" ? product.piecesPerBlock : 1)) : "";

/** A typed price keeps its meaning when the unit flips: the same goods, priced per block instead of per piece, or back. */
function convertPrice(price: string, from: QuantityUnit, to: QuantityUnit, product: Product | undefined): string {
  if (from === to || !product || price === "") return price;
  const converted = from === "piece" ? Number(price) * product.piecesPerBlock : Number(price) / product.piecesPerBlock;
  return String(Math.round(converted));
}

/** Turns a refused execution into a sentence that points at the lines to fix. */
function describeFailure(error: unknown): string {
  if (error instanceof ApiError && error.code === "INSUFFICIENT_STOCK") {
    const shortages = (error.body as { shortages?: StockShortage[] } | null)?.shortages ?? [];
    const lines = shortages.map((s) => `${s.line + 1}-qator: kerak ${som.format(s.requested)} dona, mavjud ${som.format(s.available)} dona`);
    return `Omborda tovar yetarli emas. ${lines.join("; ")}`;
  }
  return "Amalni bajarib bo'lmadi. Savdo allaqachon bajarilgan bo'lishi mumkin; ro'yxatni yangilab ko'ring.";
}

export function SalesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const sales = useQuery({ queryKey: SALES_KEY, queryFn: api.listSales });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: SALES_KEY });
    // Executing moves stock and cash, so everything derived from them is stale too.
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-report"] });
    void queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
  };

  const execute = useMutation({ mutationFn: api.executeSale, onSuccess: refresh });
  const remove = useMutation({ mutationFn: api.deleteSale, onSuccess: refresh });

  function confirmExecute(s: Sale) {
    if (window.confirm(`${s.number} bajarilsinmi? Tovar ombordan chiqadi. Kassaga ${som.format(s.total)} so'm kirim yoziladi. Keyin o'zgartirib bo'lmaydi.`)) {
      execute.mutate(s.id);
    }
  }

  return (
    <section>
      <h2>Savdolar</h2>
      <div className="toolbar">
        <button onClick={() => setEditing({ kind: "new" })}>Yangi savdo</button>
      </div>

      {editing && (
        <SaleForm
          key={editing.kind === "sale" ? editing.sale.id : "new"}
          sale={editing.kind === "sale" ? editing.sale : null}
          onDone={() => {
            setEditing(null);
            refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {execute.isError && (
        <p role="alert" className="error">
          {describeFailure(execute.error)}
        </p>
      )}
      {remove.isError && (
        <p role="alert" className="error">
          {describeFailure(remove.error)}
        </p>
      )}
      {sales.isPending && <p className="muted">Yuklanmoqda…</p>}
      {sales.isError && <p className="error">Savdolarni yuklab bo'lmadi.</p>}
      {sales.data && (
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
            {sales.data.map((s) => (
              <tr key={s.id}>
                <td>{s.number}</td>
                <td>{s.date}</td>
                <td className={`status-${s.status}`}>{s.status === "draft" ? "Qoralama" : "Bajarilgan"}</td>
                <td className="num">{som.format(s.total)}</td>
                <td className="row-actions">
                  <button
                    className="secondary"
                    onClick={() => {
                      execute.reset();
                      setEditing({ kind: "sale", sale: s });
                    }}
                  >
                    {s.status === "draft" ? "Tahrirlash" : "Ko'rish"}
                  </button>
                  {s.status === "draft" && (
                    <>
                      <button onClick={() => confirmExecute(s)} disabled={execute.isPending}>
                        Bajarish
                      </button>
                      <button
                        className="secondary"
                        disabled={remove.isPending}
                        onClick={() => window.confirm(`${s.number} qoralamasi o'chirilsinmi?`) && remove.mutate(s.id)}
                      >
                        O'chirish
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {sales.data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Hali savdo yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

const emptyLine = (warehouseId: string): LineDraft => ({ productId: "", warehouseId, unit: "piece", quantity: "", unitPrice: "", priceEdited: false });

function SaleForm({ sale, onDone, onCancel }: { sale: Sale | null; onDone: () => void; onCancel: () => void }) {
  const readOnly = sale?.status === "executed";
  const [date, setDate] = useState(sale?.date ?? today());
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(sale?.defaultWarehouseId ?? "");
  const [note, setNote] = useState(sale?.note ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    sale
      ? sale.lines.map((l) => ({
          productId: l.productId,
          warehouseId: l.warehouseId,
          unit: l.unit,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          priceEdited: true,
        }))
      : [emptyLine("")],
  );

  // An executed sale may mention archived products, so the read-only view lists them too.
  const products = useQuery({ queryKey: ["products", "", readOnly], queryFn: () => api.listProducts({ search: "", includeArchived: readOnly }) });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouseTree });
  const stock = useQuery({ queryKey: ["stock-report"], queryFn: api.stockByProduct });
  const warehouseOptions = flattenWarehouses(warehouses.data ?? []);
  const productById = new Map((products.data ?? []).map((p) => [p.id, p] as const));

  const save = useMutation({
    mutationFn: () => {
      const body: SaveSaleRequest = {
        date,
        defaultWarehouseId: defaultWarehouseId || null,
        note,
        lines: lines.map(({ priceEdited: _, ...l }) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      };
      return sale ? api.updateSale(sale.id, body) : api.createSale(body);
    },
    onSuccess: onDone,
  });

  const changeLine = (index: number, changes: Partial<LineDraft>) =>
    setLines((all) => all.map((l, i) => (i === index ? { ...l, ...changes } : l)));

  /** Picking a product or unit fills the default price, unless the owner already typed one. */
  function changePricing(index: number, changes: Pick<Partial<LineDraft>, "productId" | "unit">) {
    setLines((all) =>
      all.map((l, i) => {
        if (i !== index) return l;
        const next = { ...l, ...changes };
        const product = productById.get(next.productId);
        if (!l.priceEdited) return { ...next, unitPrice: defaultPrice(next.unit, product) };
        return { ...next, unitPrice: convertPrice(l.unitPrice, l.unit, next.unit, product) };
      }),
    );
  }

  const availableAt = (productId: string, warehouseId: string): number | null => {
    if (!productId || !warehouseId || !stock.data) return null;
    const row: StockByProductRow | undefined = stock.data.find((r) => r.productId === productId);
    return row?.locations.find((loc) => loc.warehouseId === warehouseId)?.pieces ?? 0;
  };
  /** Pieces every line of this form takes from one (product, location). */
  const requestedAt = (productId: string, warehouseId: string) =>
    lines.filter((l) => l.productId === productId && l.warehouseId === warehouseId).reduce((sum, l) => sum + piecesOf(l, productById.get(l.productId)), 0);

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
            {lines.map((l, i) => {
              const available = availableAt(l.productId, l.warehouseId);
              const short = available !== null && requestedAt(l.productId, l.warehouseId) > available;
              return (
                <tr key={i}>
                  <td>
                    <select value={l.productId} onChange={(e) => changePricing(i, { productId: e.target.value })} required disabled={readOnly}>
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
                    {!readOnly && available !== null && (
                      <span className={short ? "error" : "muted"}>Mavjud: {som.format(available)} dona</span>
                    )}
                  </td>
                  <td>
                    <select value={l.unit} onChange={(e) => changePricing(i, { unit: e.target.value as QuantityUnit })} disabled={readOnly}>
                      <option value="piece">dona</option>
                      <option value="block">blok</option>
                    </select>
                  </td>
                  <td className="num-input">
                    <input type="number" min={1} step={1} value={l.quantity} onChange={(e) => changeLine(i, { quantity: e.target.value })} required disabled={readOnly} />
                    {l.unit === "block" && piecesOf(l, productById.get(l.productId)) > 0 && (
                      <span className="muted">= {som.format(piecesOf(l, productById.get(l.productId)))} dona</span>
                    )}
                  </td>
                  <td className="num-input">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={l.unitPrice}
                      onChange={(e) => changeLine(i, { unitPrice: e.target.value, priceEdited: true })}
                      required
                      disabled={readOnly}
                    />
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
              );
            })}
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
