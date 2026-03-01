// utils/authorization.ts
import { AppError } from "../types/appError.type.js";

/**
 * Validates that a user has the required role and a valid ID.
 *
 * @param userId - The unique identifier of the user (usually from token claims).
 * @param userRole - The role of the user (e.g., "student", "counselor").
 * @param requiredRole - The role required to access the resource (default: "student").
 *
 * @throws {AppError} If:
 * - User ID is missing (401 UNAUTHORIZED)
 * - User role is missing (401 FORBIDDEN)
 * - User does not match the required role (403 FORBIDDEN)
 *
 * @example
 * ```ts
 * validateUser(req.user?.sub, req.user?.role, "student");
 * ```
 */
export function validateUser(
  userId?: string,
  userRole?: string,
  requiredRole: string = "student"
): void {
  if (!userId) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Unauthorized: User ID missing",
      true
    );
  }

  if (!userRole) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Forbidden: Insufficient permissions",
      true
    );
  }

  if (userRole !== requiredRole) {
    throw new AppError(
      403,
      "FORBIDDEN",
      `Forbidden: ${requiredRole} role required`,
      true
    );
  }
}