// utils/authorization.ts
import { AppError } from "../types/appError.type.js";

/**
 * Validates that a user is authenticated and optionally has the required role.
 *
 * @param userId - The unique identifier of the user (usually from token claims).
 * @param userRole - The role of the user (e.g., "student", "counselor").
 * @param requiredRole - Optional role required to access the resource.
 *
 * @throws {AppError} If:
 * - User ID is missing (401 UNAUTHORIZED)
 * - User role is missing when a required role is provided (403 FORBIDDEN)
 * - User does not match the required role (403 FORBIDDEN)
 *
 * @example
 * ```ts
 * validateUser(req.user?.sub);
 * ```
 */
export function validateUser(
  userId?: string,
  userRole?: string,
  requiredRole?: string
): void {
  if (!userId) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Unauthorized: User ID missing",
      true
    );
  }

  if (requiredRole && !userRole) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Forbidden: Insufficient permissions",
      true
    );
  }

  if (requiredRole && userRole !== requiredRole) {
    throw new AppError(
      403,
      "FORBIDDEN",
      `Forbidden: ${requiredRole} role required`,
      true
    );
  }
}