import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { AppError } from "../types/appError.type.js";
import { env } from "../config/env.config.js";
import { logger } from "../utils/logger.util.js";
import type { ApiResponse } from "../types/apiResponse.type.js";

/**
 * Error handling middleware for Express applications.
 *
 * @file error.middleware.ts
 * @description This middleware captures errors thrown in the application and formats
 * them into a consistent JSON response. It distinguishes between custom
 * application errors (AppError) and generic errors, providing appropriate
 * status codes and messages. Generates unique error IDs for correlation
 * between client reports and server logs.
 *
 * @param err - The error object, which can be an instance of AppError or a generic Error.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 *
 * @example
 * // Example usage in an Express app:
 * app.use(errorMiddleware);
 * 
 * @author Arthur M. Artugue
 * @created 2025-08-20
 * @updated 2025-12-30
 */
export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const isOperational = isAppError && err.isOperational;
  const errorId = randomUUID();

  // Logging - Always log full details for debugging (even in production)
  if (isOperational) {
    logger.warn("Operational error", {
      errorId,
      message: err.message,
      code: isAppError ? err.code : undefined,
      path: req.path,
      method: req.method,
      internalCode: isAppError ? err.internalCode : undefined,
    });
  } else {
    // Always log stack traces for unexpected errors (critical for production debugging)
    logger.error("Unexpected error", {
      errorId,
      message: err.message,
      stack: err.stack, 
      errorName: err.name,
      path: req.path,
      method: req.method,
      // Log original error if available
      ...(err.cause && typeof err.cause === 'object' ? { cause: err.cause } : {}),
    });
  }

  // Response fields
  const statusCode: number = isAppError ? err.statusCode : 500;
  const code: string = isAppError ? err.code : "INTERNAL_SERVER_ERROR";
  const message: string =
    isOperational && isAppError
      ? err.message
      : "Internal Server Error"; // hide real error if not operational

  const response: ApiResponse = {
    success: false,
    code,
    message,
    errorId, 
    ...(env.NODE_ENV === "development" && {
      details: {
        stack: err.stack,
        name: err.name,
        ...(err.cause && typeof err.cause === 'object' ? { cause: err.cause } : {}),
      },
    }),
  };

  res.status(statusCode).json(response);
}