import type {
  CreateProductRequest,
  CreateWarehouseRequest,
  CurrentUser,
  LoginRequest,
  Product,
  UpdateProductRequest,
  Warehouse,
  WarehouseNode,
} from "@erp/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The API's machine-readable error code, when the response body carried one. */
    readonly code?: string,
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
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { code?: string } | null;
    throw new ApiError(res.status, res.statusText, error?.code);
  }
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

  listProducts(query: { search: string; includeArchived: boolean }) {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.includeArchived) params.set("includeArchived", "true");
    return request<Product[]>("GET", `/api/products?${params}`);
  },
  createProduct: (body: CreateProductRequest) => request<Product>("POST", "/api/products", body),
  updateProduct: (id: string, body: UpdateProductRequest) => request<Product>("PATCH", `/api/products/${id}`, body),
  setProductArchived: (id: string, archived: boolean) =>
    request<Product>("POST", `/api/products/${id}/${archived ? "archive" : "unarchive"}`),

  warehouseTree: () => request<WarehouseNode[]>("GET", "/api/warehouses"),
  createWarehouse: (body: CreateWarehouseRequest) => request<Warehouse>("POST", "/api/warehouses", body),
  renameWarehouse: (id: string, name: string) => request<Warehouse>("PATCH", `/api/warehouses/${id}`, { name }),
  deleteWarehouse: (id: string) => request<void>("DELETE", `/api/warehouses/${id}`),
};
