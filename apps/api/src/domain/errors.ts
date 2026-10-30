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
