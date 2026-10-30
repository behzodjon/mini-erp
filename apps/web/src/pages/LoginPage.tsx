import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import { Icon } from "../icons";
import { SESSION_KEY } from "../session";

export function LoginPage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (user) => queryClient.setQueryData(SESSION_KEY, user),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ username, password });
  }

  const wrongCredentials = login.error instanceof ApiError && login.error.status === 401;

  return (
    <main className="login">
      <form onSubmit={submit} className="card">
        <div className="logo">
          <Icon name="logo" />
        </div>
        <h1>Ichimliklar do'koni</h1>
        <p className="subtitle">Hisobingizga kiring</p>
        <label>
          Login
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label>
          Parol
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {login.isError && (
          <p role="alert" className="error">
            {wrongCredentials ? "Login yoki parol noto'g'ri" : "Xatolik yuz berdi. Qayta urinib ko'ring."}
          </p>
        )}
        <button type="submit" disabled={login.isPending}>
          Kirish
        </button>
      </form>
    </main>
  );
}
