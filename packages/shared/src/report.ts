import { z } from "zod";
import { isoDate } from "./date.js";

export type StockQuantity = {
  pieces: number;
  blocks: number;
  /** Pieces left over after whole blocks. */
  remainderPieces: number;
};

export type StockLocation = StockQuantity & { warehouseId: string; warehouseName: string };


/** What one warehouse node holds of one product. Products with nothing there are left out. */
export type StockAtNodeRow = { productId: string; pieces: number };

/** One product at a warehouse node: what it holds, in pieces and blocks, valued at the product's average cost. */
export type StockProductLine = StockQuantity & {
  productId: string;
  productName: string;
  piecesPerBlock: number;
  averageCost: number;
  /** pieces × average cost, in so'm. */
  value: number;
};

export type StockByProductRow = StockProductLine & { locations: StockLocation[] };

/** A warehouse node with its own stock, the roll-up of its subtree, and the subtree totals. */
export type StockByWarehouseNode = {
  warehouseId: string;
  name: string;
  /** What this node holds itself. */
  own: StockProductLine[];
  /** What this node and all of its descendants hold, per product. */
  rolledUp: StockProductLine[];
  /** Pieces and value of `rolledUp`. */
  totalPieces: number;
  totalValue: number;
  children: StockByWarehouseNode[];
};

/** A date range of whole shop days, both ends included. */
export const dateRangeQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((range) => range.from <= range.to, { message: "from must not be after to", path: ["to"] });
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

/** Revenue, cost of goods sold and what is left, in so'm. */
export type SalesFigures = { revenue: number; costOfGoodsSold: number; grossProfit: number };

export type SalesSummary = SalesFigures & { count: number };

/** One product's sales in the range. */
export type SalesByProductRow = StockQuantity &
  SalesFigures & {
    productId: string;
    productName: string;
    piecesPerBlock: number;
  };

/** An executed sale in the range, with the figures the list shows. */
export type SalesReportEntry = SalesFigures & {
  id: string;
  number: string;
  /** The document date. */
  date: string;
  /** The shop day the sale was executed on, which is what the range filters by. */
  executedOn: string;
};

export type SalesReport = {
  summary: SalesSummary;
  products: SalesByProductRow[];
  /** Oldest first. */
  sales: SalesReportEntry[];
};

/** Operating expense categories; the API derives the list from its category rules. */
export type ExpenseCategory = "travel_cost" | "rent" | "salary" | "other_expense";

export type PnlReport = SalesFigures & {
  /** Always every expense category, zero or not. */
  expenses: { category: ExpenseCategory; amount: number }[];
  totalExpenses: number;
  /** Net value of executed stock counts at average cost: negative for shrinkage, positive for a surplus. */
  stockCountResult: number;
  otherIncome: number;
  netProfit: number;
};

/** What one counterparty owes the shop or is owed by it; only non-zero balances are listed. */
export type DebtBalance = { counterpartyId: string; counterpartyName: string; amount: number };

export type CashAndDebts = {
  /** May be negative. */
  cashBalance: number;
  /** Loans given − repayments received. */
  owedToMe: DebtBalance[];
  /** Loans received − repayments paid. */
  iOwe: DebtBalance[];
};
