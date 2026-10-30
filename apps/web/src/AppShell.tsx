import type { CurrentUser } from "@erp/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { CashPage } from "./pages/CashPage";
import { ProductsPage } from "./pages/ProductsPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { SESSION_KEY } from "./session";

const NAV = [
  { to: "/mahsulotlar", label: "Mahsulotlar" },
  { to: "/omborlar", label: "Omborlar" },
  { to: "/xaridlar", label: "Xaridlar" },
  { to: "/savdolar", label: "Savdolar" },
  { to: "/inventarizatsiya", label: "Inventarizatsiya" },
  { to: "/kassa", label: "Kassa" },
  { to: "/hisobotlar", label: "Hisobotlar" },
];

/** Sections that have a real page; the rest show a placeholder until their ticket lands. */
const PAGES: Record<string, ReactElement> = {
  "/mahsulotlar": <ProductsPage />,
  "/omborlar": <WarehousesPage />,
  "/kassa": <CashPage />,
};

function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="muted">Bu bo'lim tez orada qo'shiladi.</p>
    </section>
  );
}

export function AppShell({ user }: { user: CurrentUser }) {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => queryClient.setQueryData(SESSION_KEY, null),
  });

  return (
    <div className="shell">
      <aside>
        <h1>Ichimliklar do'koni</h1>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <span>{user.username}</span>
          <button onClick={() => logout.mutate()} disabled={logout.isPending}>
            Chiqish
          </button>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Placeholder title="Xush kelibsiz" />} />
          {NAV.map((item) => (
            <Route key={item.to} path={item.to} element={PAGES[item.to] ?? <Placeholder title={item.label} />} />
          ))}
          <Route path="*" element={<Placeholder title="Sahifa topilmadi" />} />
        </Routes>
      </main>
    </div>
  );
}
