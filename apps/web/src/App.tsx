import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { AppShell } from "./AppShell";
import { LoginPage } from "./pages/LoginPage";
import { SESSION_KEY } from "./session";

export function App() {
  const session = useQuery({ queryKey: SESSION_KEY, queryFn: api.currentUser });

  if (session.isPending) return <p className="center-note">Yuklanmoqda…</p>;
  if (session.isError) return <p className="center-note">Serverga ulanib bo'lmadi. Keyinroq qayta urinib ko'ring.</p>;
  return session.data ? <AppShell user={session.data} /> : <LoginPage />;
}
