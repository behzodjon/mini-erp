import type { CurrentUser } from "@erp/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { Icon } from "./icons";
import { CashPage } from "./pages/CashPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SalesPage } from "./pages/SalesPage";
import { StockCountsPage } from "./pages/StockCountsPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { SESSION_KEY } from "./session";

const NAV = [
  { to: "/mahsulotlar", label: "Mahsulotlar", icon: "products" },
  { to: "/omborlar", label: "Omborlar", icon: "warehouses" },
  { to: "/xaridlar", label: "Xaridlar", icon: "purchases" },
  { to: "/savdolar", label: "Savdolar", icon: "sales" },
  { to: "/inventarizatsiya", label: "Inventarizatsiya", icon: "counts" },
  { to: "/kassa", label: "Kassa", icon: "cash" },
  { to: "/hisobotlar", label: "Hisobotlar", icon: "reports" },
] as const;

const PAGES: Record<string, ReactElement> = {
  "/mahsulotlar": <ProductsPage />,
  "/omborlar": <WarehousesPage />,
  "/xaridlar": <PurchasesPage />,
  "/savdolar": <SalesPage />,
  "/inventarizatsiya": <StockCountsPage />,
  "/kassa": <CashPage />,
  "/hisobotlar": <ReportsPage />,
};

function NotFound() {
  return (
    <section>
      <h2>Sahifa topilmadi</h2>
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
        <div className="brand">
          <span className="logo">
            <Icon name="logo" />
          </span>
          Ichimliklar do'koni
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <span className="avatar">{user.username.slice(0, 1)}</span>
          <span className="name">{user.username}</span>
          <button onClick={() => logout.mutate()} disabled={logout.isPending}>
            Chiqish
          </button>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/hisobotlar" replace />} />
          {NAV.map((item) => (
            <Route key={item.to} path={item.to} element={PAGES[item.to]} />
          ))}
          <Route path="/savdolar/:id" element={<SalesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
