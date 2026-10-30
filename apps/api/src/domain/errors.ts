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

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(what: string) {
    super(`${what} not found`);
  }
}
