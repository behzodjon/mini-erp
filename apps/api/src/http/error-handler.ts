import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { ConflictError, DomainError, InsufficientStockError, InvalidCredentialsError, NotAuthenticatedError, NotFoundError } from "../domain/errors.js";

const isClientError = (error: unknown): error is FastifyError & { statusCode: number } =>
  error instanceof Error && "statusCode" in error && typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500;

/** Maps domain errors to HTTP status codes in one place, so use cases never know about HTTP. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid request", issues: error.issues });
    }
    if (error instanceof InvalidCredentialsError || error instanceof NotAuthenticatedError) {
      return reply.status(401).send({ code: error.code, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ code: error.code, message: error.message });
    }
    if (error instanceof InsufficientStockError) {
      return reply.status(409).send({ code: error.code, message: error.message, shortages: error.shortages });
    }
    if (error instanceof ConflictError) {
      return reply.status(409).send({ code: error.code, message: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ code: error.code, message: error.message });
    }
    // Fastify's own client errors (malformed JSON, oversized body, ...) carry their 4xx status.
    if (isClientError(error)) {
      return reply.status(error.statusCode).send({ code: error.code ?? "BAD_REQUEST", message: error.message });
    }
    request.log.error(error);
    return reply.status(500).send({ code: "INTERNAL_ERROR", message: "Internal server error" });
  });
}
