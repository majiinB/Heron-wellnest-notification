import type { Request } from "express";

/**
 * Extended Express Request interface to include authenticated user information
 * 
 * @file authRequest.interface.ts
 * @description This interface extends the standard Express Request object to include
 * authenticated user information, such as email and name, extracted from a verified Google ID token.
 * 
 * @author Arthur M. Artugue
 * @created 2025-08-28
 * @updated 2025-09-03
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    sub:string;
    email: string;
    name: string;
    role: string;
    picture?: string;
  };
}
