import * as jose from 'jose';
import fs from 'fs';
import { createPublicKey } from 'crypto';
import {env} from '../config/env.config.js'
import type { JwtConfig } from '../types/jwtConfig.type.js';
import type { AccessTokenClaims } from '../types/accessTokenClaim.type.js';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { AppError } from '../types/appError.type.js';
import { JOSEAlgNotAllowed, JWSSignatureVerificationFailed, JWTClaimValidationFailed, JWTExpired, JWTInvalid } from 'jose/errors';

type GoogleOidcPayload = jose.JWTPayload & {
  email?: string;
  email_verified?: boolean;
};

const GOOGLE_ISSUER = 'https://accounts.google.com';
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

const cfg: JwtConfig = {
  alg: env.JWT_ALGORITHM,
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
}

// Load keys based on algorithm
let verifyingKey: Uint8Array | jose.KeyObject;

if (cfg.alg === 'HS256') {
  if (!env.JWT_SECRET) {
    throw new AppError(
      500,
      "JWT_SECRET_MISSING",
      "JWT_SECRET is required for HS256",
      true
    );
  }
  const secretBuffer = new TextEncoder().encode(env.JWT_SECRET); // convert string to Uint8Array
  verifyingKey = secretBuffer;
} else if (cfg.alg === 'RS256') {
  if (!env.JWT_PRIVATE_KEY || !env.JWT_PUBLIC_KEY) {
    throw new AppError(
      500,
      "JWT_KEYS_MISSING",
      "RS256 keys are required",
      true
    );
  }

  // const privatePem = fs.existsSync(env.JWT_PRIVATE_KEY)
  //   ? fs.readFileSync(env.JWT_PRIVATE_KEY, 'utf8')
  //   : env.JWT_PRIVATE_KEY;

  const publicPem = fs.existsSync(env.JWT_PUBLIC_KEY)
    ? fs.readFileSync(env.JWT_PUBLIC_KEY, 'utf8')
    : env.JWT_PUBLIC_KEY;

  verifyingKey = createPublicKey(publicPem);  
}

/** 
 * Verify an access or refresh token. Throws on failure. 
 * 
 * @param token - The JWT to verify
 * @returns The decoded token payload if verification succeeds
 * 
 * @throws {jose.JWTVerificationError} If token verification fails
 * */
export async function verifyToken(token: string): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify<AccessTokenClaims>(token, verifyingKey, {
      algorithms: [cfg.alg],
      issuer: cfg.issuer,
      audience: cfg.audience,
      clockTolerance: "2s", // small leeway for clock skew
    });
    return payload;
  } catch (err) {
    if (err instanceof AppError) {
      throw err
    }
    
    const message = (err as Error).message || "Unknown error";

    if (err instanceof JWTExpired) {
      throw new AppError(
        401,
        "AUTH_TOKEN_EXPIRED",
        "Token expired. Please login again.",
        true
      );
    }

    if (err instanceof JWSSignatureVerificationFailed){
      throw new AppError(
        401,
        "AUTH_TOKEN_INVALID_SIGNATURE",
        "Invalid token signature.",
        true
      );
    }

    if (err instanceof JWTClaimValidationFailed){
      throw new AppError(
        403,
        "AUTH_TOKEN_INVALID_CLAIM",
        "Invalid token claim.",
        true
      );
    }

    if (err instanceof JWTInvalid){
      throw new AppError(
        401, 
        "AUTH_TOKEN_MALFORMED", 
        "Token is malformed or structurally invalid.", 
        true
      );
    }

    if (err instanceof JOSEAlgNotAllowed){
      throw new AppError(
        401,
        "AUTH_TOKEN_INVALID",
        "Invalid token. Token may be of different source.",
        true
      );
    }

    const appError = new AppError(
      500, 
      "AUTH_TOKEN_VERIFICATION_FAILED", 
      `Failed to verify token: ${message}`, 
      false
    );

    // Preserve original error details for debugging
    if (err instanceof Error) {
      appError.stack = err.stack; // replace stack with original
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (appError as any).originalError = err; // optional, keep full error object
    }

    throw appError;
  }
}

export async function verifyPubSubJwt(
  token: string,
  expectedAudience: string,
  expectedEmail: string
): Promise<GoogleOidcPayload> {
  try {
    const { payload } = await jwtVerify<GoogleOidcPayload>(token, JWKS, {
      issuer: GOOGLE_ISSUER,
      audience: expectedAudience,
    });

    if (payload.email !== expectedEmail) {
      throw new AppError(403, 'PUBSUB_INVALID_EMAIL', 'Invalid push service account email', true);
    }

    if (!payload.email_verified) {
      throw new AppError(403, 'PUBSUB_EMAIL_NOT_VERIFIED', 'Push service account email not verified', true);
    }

    return payload;
  } catch (err) {
    if (err instanceof AppError) throw err;

    throw new AppError(401, 'PUBSUB_AUTH_FAILED', 'Invalid Pub/Sub JWT', true);
  }
}

/**
 * Decode without verifying (useful for logging/debug, never trust result) 
 * 
 * @param token - The JWT to decode
 * @returns The decoded token payload
 * 
 * @throws {jose.JOSEError} If decoding fails
 * */
export function decodeUnsafe(token: string): jose.JWTPayload {
  return decodeJwt(token);
}

/** 
 * Helper to read Bearer token from Authorization header 
 * 
 * @param authHeader - The Authorization header value
 * @returns The extracted Bearer token, or null if not present/invalid
 * */
export function extractBearer(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, value] = authHeader.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") return null;
  return value.trim();
}

