import type { Product, QuantityUnit, SaveStockCountRequest, StockCount } from "@erp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api";
import { flattenWarehouses, som } from "../lib";

const COUNTS_KEY = ["stock-counts"] as const;
const today = () => new Date().toISOString().slice(0, 10);

type LineDraft = { productId: string; unit: QuantityUnit; quantity: string };
type Editing = { kind: "new" } | { kind: "count"; count: StockCount };

const piecesOf = (l: LineDraft, product: Product | undefined) =>
  (Number(l.quantity) || 0) * (l.unit === "block" ? (product?.piecesPerBlock ?? 0) : 1);

/** A signed whole number, so a shortage and a surplus are told apart at a glance. */
const signed = (n: number) => (n > 0 ? `+${som.format(n)}` : som.format(n));

export function StockCountsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const counts = useQuery({ queryKey: COUNTS_KEY, queryFn: api.listStockCounts });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouseTree });
  const warehouseLabel = new Map(flattenWarehouses(warehouses.data ?? []).map((w) => [w.id, w.label] as const));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: COUNTS_KEY });
    // Executing moves stock, so everything derived from it is stale too.
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-report"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-by-warehouse"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-at"] });
  };

  const execute = useMutation({ mutationFn: api.executeStockCount, onSuccess: refresh });
  const remove = useMutation({ mutationFn: api.deleteStockCount, onSuccess: refresh });

  function confirmExecute(c: StockCount) {
    if (window.confirm(`${c.number} bajarilsinmi? Ombor qoldig'i sanalgan miqdorga tenglashtiriladi. Keyin o'zgartirib bo'lmaydi.`)) {
      execute.mutate(c.id);
    }
  }

  return (
    <section>
      <h2>Inventarizatsiya</h2>
      <div className="toolbar">
        <button onClick={() => setEditing({ kind: "new" })}>Yangi inventarizatsiya</button>
      </div>

      {editing && (
        <StockCountForm
          key={editing.kind === "count" ? editing.count.id : "new"}
          count={editing.kind === "count" ? editing.count : null}
          onDone={() => {
            setEditing(null);
            refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {(execute.isError || remove.isError) && (
        <p role="alert" className="error">
          Amalni bajarib bo'lmadi. Inventarizatsiya allaqachon bajarilgan bo'lishi mumkin; ro'yxatni yangilab ko'ring.
        </p>
      )}
      {counts.isPending && <p className="muted">Yuklanmoqda…</p>}
      {counts.isError && <p className="error">Inventarizatsiyalarni yuklab bo'lmadi.</p>}
      {counts.data && (
        <table className="data">
          <thead>
            <tr>
              <th>Raqam</th>
              <th>Sana</th>
              <th>Ombor</th>
              <th>Holati</th>
              <th className="num">Farq qiymati (so'm)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {counts.data.map((c) => (
              <tr key={c.id}>
                <td>{c.number}</td>
                <td>{c.date}</td>
                <td>{warehouseLabel.get(c.warehouseId) ?? "?"}</td>
                <td className={`status-${c.status}`}>{c.status === "draft" ? "Qoralama" : "Bajarilgan"}</td>
                <td className="num">{c.totalValue === null ? "—" : signed(c.totalValue)}</td>
                <td className="row-actions">
                  <button
                    className="secondary"
                    onClick={() => {
                      execute.reset();
                      setEditing({ kind: "count", count: c });
                    }}
                  >
                    {c.status === "draft" ? "Tahrirlash" : "Ko'rish"}
                  </button>
                  {c.status === "draft" && (
                    <>
                      <button onClick={() => confirmExecute(c)} disabled={execute.isPending}>
                        Bajarish
                      </button>
                      <button
                        className="secondary"
                        disabled={remove.isPending}
                        onClick={() => window.confirm(`${c.number} qoralamasi o'chirilsinmi?`) && remove.mutate(c.id)}
                      >
                        O'chirish
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {counts.data.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Hali inventarizatsiya yo'q.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

const emptyLine = (): LineDraft => ({ productId: "", unit: "piece", quantity: "" });

function StockCountForm({ count, onDone, onCancel }: { count: StockCount | null; onDone: () => void; onCancel: () => void }) {
  const readOnly = count?.status === "executed";
  const [date, setDate] = useState(count?.date ?? today());
  const [warehouseId, setWarehouseId] = useState(count?.warehouseId ?? "");
  const [note, setNote] = useState(count?.note ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    count ? count.lines.map((l) => ({ productId: l.productId, unit: l.unit, quantity: String(l.quantity) })) : [emptyLine()],
  );

  // An executed count may mention archived products, so the read-only view lists them too.
  const products = useQuery({ queryKey: ["products", "", readOnly], queryFn: () => api.listProducts({ search: "", includeArchived: readOnly }) });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouseTree });
  const atNode = useQuery({
    queryKey: ["stock-at", warehouseId],
    queryFn: () => api.stockAtNode(warehouseId),
    enabled: !readOnly && warehouseId !== "",
  });
  const warehouseOptions = flattenWarehouses(warehouses.data ?? []);
  const productById = new Map((products.data ?? []).map((p) => [p.id, p] as const));
  const systemPieces = (productId: string): number | null =>
    !productId || !atNode.data ? null : (atNode.data.find((r) => r.productId === productId)?.pieces ?? 0);

  const save = useMutation({
    mutationFn: () => {
      const body: SaveStockCountRequest = {
        date,
        warehouseId,
        note,
        lines: lines.map((l) => ({ ...l, quantity: Number(l.quantity) })),
      };
      return count ? api.updateStockCount(count.id, body) : api.createStockCount(body);
    },
    onSuccess: onDone,
  });

  const changeLine = (index: number, changes: Partial<LineDraft>) =>
    setLines((all) => all.map((l, i) => (i === index ? { ...l, ...changes } : l)));

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
        Ombor
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required disabled={readOnly}>
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
              <th>Birlik</th>
              <th className="num">Sanalgan</th>
              <th className="num">Tizimda (dona)</th>
              <th className="num">Farq (dona)</th>
              {readOnly && <th className="num">Qiymati (so'm)</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const saved = count?.lines[i];
              const counted = piecesOf(l, productById.get(l.productId));
              // A draft shows the stock as it is now; an executed count shows what it compared against.
              const system = readOnly ? (saved?.systemPieces ?? null) : systemPieces(l.productId);
              const difference = readOnly ? (saved?.difference ?? null) : system === null || l.quantity === "" ? null : counted - system;
              return (
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
                    <select value={l.unit} onChange={(e) => changeLine(i, { unit: e.target.value as QuantityUnit })} disabled={readOnly}>
                      <option value="piece">dona</option>
                      <option value="block">blok</option>
                    </select>
                  </td>
                  <td className="num-input">
                    <input type="number" min={0} step={1} value={l.quantity} onChange={(e) => changeLine(i, { quantity: e.target.value })} required disabled={readOnly} />
                    {l.unit === "block" && counted > 0 && <span className="muted">= {som.format(counted)} dona</span>}
                  </td>
                  <td className="num">{system === null ? "—" : som.format(system)}</td>
                  <td className={`num ${difference !== null && difference < 0 ? "error" : ""}`}>{difference === null ? "—" : signed(difference)}</td>
                  {readOnly && <td className="num">{saved?.value == null ? "—" : signed(saved.value)}</td>}
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
          <button type="button" className="secondary" onClick={() => setLines((all) => [...all, emptyLine()])}>
            + Qator qo'shish
          </button>
        )}
      </div>

      {readOnly && count?.totalValue != null && <p className="purchase-total">Farqning jami qiymati: {signed(count.totalValue)} so'm</p>}
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
          Saqlab bo'lmadi. Ma'lumotlarni tekshirib, qayta urinib ko'ring. Bir mahsulot bir inventarizatsiyada faqat bir marta sanaladi.
        </p>
      )}
    </form>
  );
}
