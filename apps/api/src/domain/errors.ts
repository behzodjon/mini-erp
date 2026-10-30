import type { StockShortage } from "@erp/shared";

/** Base class for errors the domain/application raise on purpose. The HTTP layer maps them to status codes. */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS";
  constructor() {
    super("Invalid username or password");
  }
}

export class NotAuthenticatedError extends DomainError {
  readonly code = "NOT_AUTHENTICATED";
  constructor() {
    super("Authentication required");
  }
}

export class WarehouseHasChildrenError extends DomainError {
  readonly code = "WAREHOUSE_HAS_CHILDREN";
  constructor() {
    super("Warehouse has sub-warehouses and cannot be deleted");
  }
}

export class CounterpartyRequiredError extends DomainError {
  readonly code = "COUNTERPARTY_REQUIRED";
  constructor() {
    super("Loan entries need a counterparty");
  }
}

export class CategoryDirectionMismatchError extends DomainError {
  readonly code = "CATEGORY_DIRECTION_MISMATCH";
  constructor() {
    super("This category cannot be used with the chosen direction");
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(what: string) {
    super(`${what} not found`);
  }
}

/** The request is valid but conflicts with the current state of the data. */
export abstract class ConflictError extends DomainError {}

export class AlreadyExecutedError extends ConflictError {
  readonly code = "ALREADY_EXECUTED";
  constructor() {
    super("This document has already been executed");
  }
}

export class InsufficientStockError extends ConflictError {
  readonly code = "INSUFFICIENT_STOCK";
  constructor(readonly shortages: readonly StockShortage[]) {
    const lines = shortages.map((s) => s.line + 1).join(", ");
    super(`Not enough stock for line ${lines}`);
  }
}

export class PiecesPerBlockLockedError extends ConflictError {
  readonly code = "PIECES_PER_BLOCK_LOCKED";
  constructor() {
    super("Pieces per block cannot change once the product has stock movements");
  }
}

export class WarehouseHasStockError extends ConflictError {
  readonly code = "WAREHOUSE_HAS_STOCK";
  constructor() {
    super("Warehouse holds stock and cannot be deleted");
  }
}
