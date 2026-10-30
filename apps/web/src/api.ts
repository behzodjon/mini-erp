import type { CurrentUser, LoginRequest } from "@erp/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  /** Resolves null when nobody is logged in. */
  async currentUser(): Promise<CurrentUser | null> {
    try {
      return await request<CurrentUser>("GET", "/api/auth/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  login: (credentials: LoginRequest) => request<CurrentUser>("POST", "/api/auth/login", credentials),
  logout: () => request<void>("POST", "/api/auth/logout"),
};
