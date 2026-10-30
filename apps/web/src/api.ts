import type {
  CashAndDebts,
  CashEntry,
  CashListRow,
  Counterparty,
  CreateCashEntryRequest,
  CreateCounterpartyRequest,
  CreateProductRequest,
  CreateWarehouseRequest,
  CurrentUser,
  LoginRequest,
  PnlReport,
  Product,
  Purchase,
  Sale,
  SavePurchaseRequest,
  SaveSaleRequest,
  SalesReport,
  SaveStockCountRequest,
  StockAtNodeRow,
  StockByProductRow,
  StockByWarehouseNode,
  StockCount,
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
    /** The parsed error body, for errors that carry more than a code (e.g. stock shortages). */
    readonly body?: unknown,
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
    throw new ApiError(res.status, res.statusText, error?.code, error);
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

  listCounterparties: () => request<Counterparty[]>("GET", "/api/counterparties"),
  createCounterparty: (body: CreateCounterpartyRequest) => request<Counterparty>("POST", "/api/counterparties", body),
  listCashEntries: () => request<CashListRow[]>("GET", "/api/cash-entries"),
  createCashEntry: (body: CreateCashEntryRequest) => request<CashEntry>("POST", "/api/cash-entries", body),

  listPurchases: () => request<Purchase[]>("GET", "/api/purchases"),
  createPurchase: (body: SavePurchaseRequest) => request<Purchase>("POST", "/api/purchases", body),
  updatePurchase: (id: string, body: SavePurchaseRequest) => request<Purchase>("PUT", `/api/purchases/${id}`, body),
  deletePurchase: (id: string) => request<void>("DELETE", `/api/purchases/${id}`),
  executePurchase: (id: string) => request<Purchase>("POST", `/api/purchases/${id}/execute`),

  listSales: () => request<Sale[]>("GET", "/api/sales"),
  getSale: (id: string) => request<Sale>("GET", `/api/sales/${id}`),
  createSale: (body: SaveSaleRequest) => request<Sale>("POST", "/api/sales", body),
  updateSale: (id: string, body: SaveSaleRequest) => request<Sale>("PUT", `/api/sales/${id}`, body),
  deleteSale: (id: string) => request<void>("DELETE", `/api/sales/${id}`),
  executeSale: (id: string) => request<Sale>("POST", `/api/sales/${id}/execute`),

  listStockCounts: () => request<StockCount[]>("GET", "/api/stock-counts"),
  createStockCount: (body: SaveStockCountRequest) => request<StockCount>("POST", "/api/stock-counts", body),
  updateStockCount: (id: string, body: SaveStockCountRequest) => request<StockCount>("PUT", `/api/stock-counts/${id}`, body),
  deleteStockCount: (id: string) => request<void>("DELETE", `/api/stock-counts/${id}`),
  executeStockCount: (id: string) => request<StockCount>("POST", `/api/stock-counts/${id}/execute`),

  stockAtNode: (warehouseId: string) => request<StockAtNodeRow[]>("GET", `/api/reports/stock-at/${warehouseId}`),
  salesReport: (from: string, to: string) => request<SalesReport>("GET", `/api/reports/sales?from=${from}&to=${to}`),
  pnlReport: (from: string, to: string) => request<PnlReport>("GET", `/api/reports/pnl?from=${from}&to=${to}`),
  cashAndDebts: () => request<CashAndDebts>("GET", "/api/reports/cash-and-debts"),
  stockByProduct: () => request<StockByProductRow[]>("GET", "/api/reports/stock"),
  stockByWarehouse: () => request<StockByWarehouseNode[]>("GET", "/api/reports/stock-by-warehouse"),

  warehouseTree: () => request<WarehouseNode[]>("GET", "/api/warehouses"),
  createWarehouse: (body: CreateWarehouseRequest) => request<Warehouse>("POST", "/api/warehouses", body),
  renameWarehouse: (id: string, name: string) => request<Warehouse>("PATCH", `/api/warehouses/${id}`, { name }),
  deleteWarehouse: (id: string) => request<void>("DELETE", `/api/warehouses/${id}`),
};
