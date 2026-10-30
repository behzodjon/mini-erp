import type { Product } from "@erp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api";

const PRODUCTS_KEY = ["products"] as const;
const som = new Intl.NumberFormat("uz-UZ");

type FormState = { name: string; sku: string; piecesPerBlock: string; defaultSalePrice: string };
const EMPTY_FORM: FormState = { name: "", sku: "", piecesPerBlock: "", defaultSalePrice: "" };

function formFrom(product: Product): FormState {
  return {
    name: product.name,
    sku: product.sku ?? "",
    piecesPerBlock: String(product.piecesPerBlock),
    defaultSalePrice: String(product.defaultSalePrice),
  };
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const products = useQuery({
    queryKey: [...PRODUCTS_KEY, search, includeArchived],
    queryFn: () => api.listProducts({ search, includeArchived }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });

  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => api.setProductArchived(id, archived),
    onSuccess: refresh,
  });

  return (
    <section>
      <h2>Mahsulotlar</h2>
      <div className="toolbar">
        <label className="search">
          Qidirish (nomi yoki SKU)
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          Arxivdagilarni ko'rsatish
        </label>
        <button onClick={() => setEditing("new")}>Yangi mahsulot</button>
      </div>

      {editing && (
        <ProductForm
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          onDone={() => {
            setEditing(null);
            void refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {products.isPending && <p className="muted">Yuklanmoqda…</p>}
      {products.isError && <p className="error">Mahsulotlarni yuklab bo'lmadi.</p>}
      {products.data && (
        <table className="data">
          <thead>
            <tr>
              <th>Nomi</th>
              <th>SKU</th>
              <th className="num">Blokda (dona)</th>
              <th className="num">Sotuv narxi (so'm)</th>
              <th className="num">O'rtacha tannarx (so'm)</th>
              <th className="num">Qoldiq (dona)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.data.map((p) => (
              <tr key={p.id} className={p.archived ? "archived" : undefined}>
                <td>{p.name}</td>
                <td>{p.sku ?? "—"}</td>
                <td className="num">{p.piecesPerBlock}</td>
                <td className="num">{som.format(p.defaultSalePrice)}</td>
                <td className="num">{som.format(p.averageCost)}</td>
                <td className="num">{som.format(p.onHandQuantity)}</td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => setEditing(p)}>
                    Tahrirlash
                  </button>
                  <button
                    className="secondary"
                    disabled={archive.isPending}
                    onClick={() => archive.mutate({ id: p.id, archived: !p.archived })}
                  >
                    {p.archived ? "Qaytarish" : "Arxivlash"}
                  </button>
                </td>
              </tr>
            ))}
            {products.data.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Mahsulot topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ProductForm({ product, onDone, onCancel }: { product: Product | null; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<FormState>(product ? formFrom(product) : EMPTY_FORM);
  const set = (field: keyof FormState) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        sku: form.sku,
        piecesPerBlock: Number(form.piecesPerBlock),
        defaultSalePrice: Number(form.defaultSalePrice),
      };
      return product ? api.updateProduct(product.id, body) : api.createProduct(body);
    },
    onSuccess: onDone,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <label>
        Nomi
        <input value={form.name} onChange={set("name")} required autoFocus />
      </label>
      <label>
        SKU / shtrix-kod
        <input value={form.sku} onChange={set("sku")} />
      </label>
      <label>
        Blokda necha dona
        <input type="number" min={1} step={1} value={form.piecesPerBlock} onChange={set("piecesPerBlock")} required />
      </label>
      <label>
        Sotuv narxi (so'm, 1 dona)
        <input type="number" min={0} step={1} value={form.defaultSalePrice} onChange={set("defaultSalePrice")} required />
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
