import type { JWTPayload } from "jose";

/**
 * Access Token Claims Type
 * 
 * @description Defines the structure for JWT access token claims.
 * 
 * @file accessTokenClaim.type.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-09-29
 * @updated 2025-09-29
 */
export type AccessTokenClaims = {
  sub: string;           // user id
  role: string;         // "student" | "admin | "counselor"
  email: string;
  name: string;
  year_level?: number; // optional, for students
  department?: string; // optional, for staff and students
} & JWTPayload;