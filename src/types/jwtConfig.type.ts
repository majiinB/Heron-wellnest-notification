/**
 * JWT Configuration Type
 * 
 * @description Defines the structure for JWT configuration settings.
 * 
 * @file jwtConfig.type.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-09-21
 * @updated 2025-09-25
 */
export type JwtConfig = {
  alg: "HS256" | "RS256";
  issuer: string;
  audience: string;
}
