import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { DomainError, InvalidCredentialsError, NotAuthenticatedError } from "../domain/errors.js";

/** Maps domain errors to HTTP status codes in one place, so use cases never know about HTTP. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid request", issues: error.issues });
    }
    if (error instanceof InvalidCredentialsError || error instanceof NotAuthenticatedError) {
      return reply.status(401).send({ code: error.code, message: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ code: error.code, message: error.message });
    }
    request.log.error(error);
    return reply.status(500).send({ code: "INTERNAL_ERROR", message: "Internal server error" });
  });
}
