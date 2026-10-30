import type { CurrentUser } from "@erp/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { CashPage } from "./pages/CashPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SalesPage } from "./pages/SalesPage";
import { StockCountsPage } from "./pages/StockCountsPage";
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
