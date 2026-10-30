import type { WarehouseNode } from "@erp/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";

const WAREHOUSES_KEY = ["warehouses"] as const;

/** What the name form is doing: adding under a parent (null = top level) or renaming a node. */
type FormMode = { kind: "add"; parent: WarehouseNode | null } | { kind: "rename"; node: WarehouseNode };

export function WarehousesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormMode | null>(null);

  const tree = useQuery({ queryKey: WAREHOUSES_KEY, queryFn: api.warehouseTree });
  const refresh = () => queryClient.invalidateQueries({ queryKey: WAREHOUSES_KEY });

  const remove = useMutation({ mutationFn: api.deleteWarehouse, onSuccess: refresh });

  return (
    <section>
      <h2>Omborlar</h2>
      <div className="toolbar">
        <button onClick={() => setForm({ kind: "add", parent: null })}>Yangi ombor</button>
      </div>

      {form && (
        <NameForm
          key={form.kind === "add" ? `add-${form.parent?.id ?? "root"}` : `rename-${form.node.id}`}
          mode={form}
          onDone={() => {
            setForm(null);
            void refresh();
          }}
          onCancel={() => setForm(null)}
        />
      )}

      {remove.error && (
        <p role="alert" className="error">
          {remove.error instanceof ApiError && remove.error.code === "WAREHOUSE_HAS_CHILDREN"
            ? "Ichida sub-omborlar bor. Avval ularni o'chiring."
            : "O'chirib bo'lmadi. Qayta urinib ko'ring."}
        </p>
      )}
      {tree.isPending && <p className="muted">Yuklanmoqda…</p>}
      {tree.isError && <p className="error">Omborlarni yuklab bo'lmadi.</p>}
      {tree.data?.length === 0 && <p className="muted">Hali ombor yo'q.</p>}
      {tree.data && tree.data.length > 0 && (
        <ul className="tree">
          {tree.data.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              onAddChild={(parent) => setForm({ kind: "add", parent })}
              onRename={(target) => setForm({ kind: "rename", node: target })}
              onDelete={(target) => {
                if (window.confirm(`"${target.name}" omborini o'chirishni tasdiqlaysizmi?`)) remove.mutate(target.id);
              }}
              busy={remove.isPending}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

type TreeNodeProps = {
  node: WarehouseNode;
  onAddChild: (parent: WarehouseNode) => void;
  onRename: (node: WarehouseNode) => void;
  onDelete: (node: WarehouseNode) => void;
  busy: boolean;
};

function TreeNode({ node, ...actions }: TreeNodeProps) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="tree-row">
        <button
          className="toggle secondary"
          aria-label={open ? "Yopish" : "Ochish"}
          aria-expanded={open}
          disabled={!hasChildren}
          onClick={() => setOpen(!open)}
        >
          {hasChildren ? (open ? "▾" : "▸") : "•"}
        </button>
        <span className="tree-name">{node.name}</span>
        <span className="row-actions">
          <button className="secondary" onClick={() => actions.onAddChild(node)}>
            Sub-ombor qo'shish
          </button>
          <button className="secondary" onClick={() => actions.onRename(node)}>
            Nomini o'zgartirish
          </button>
          <button className="secondary" disabled={actions.busy} onClick={() => actions.onDelete(node)}>
            O'chirish
          </button>
        </span>
      </div>
      {hasChildren && open && (
        <ul className="tree">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} {...actions} />
          ))}
        </ul>
      )}
    </li>
  );
}

function NameForm({ mode, onDone, onCancel }: { mode: FormMode; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(mode.kind === "rename" ? mode.node.name : "");

  const save = useMutation({
    mutationFn: () =>
      mode.kind === "rename"
        ? api.renameWarehouse(mode.node.id, name)
        : api.createWarehouse({ name, parentId: mode.parent?.id ?? null }),
    onSuccess: onDone,
  });

  const title =
    mode.kind === "rename"
      ? `Nomini o'zgartirish: ${mode.node.name}`
      : mode.parent
        ? `Yangi sub-ombor: ${mode.parent.name} ichida`
        : "Yangi ombor";

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <label>
        {title}
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
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
          Saqlab bo'lmadi. Nomni tekshirib, qayta urinib ko'ring.
        </p>
      )}
    </form>
  );
}
