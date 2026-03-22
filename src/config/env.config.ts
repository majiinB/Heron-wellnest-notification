import * as dotenv from "dotenv";
import * as z from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

/**
 * Environment configuration for the API.
 *
 * This module defines the environment variables required for the application,
 * validates them using Zod, and exports them for use throughout the application.
 *
 * @file env.config.ts
 * @description Configuration for environment variables.
 * 
 * Usage:
 * - Imported in `app.ts` to access environment variables.
 * - Validates required variables and provides defaults where applicable.
 *
 * @author Arthur M. Artugue
 * @created 2025-08-17
 * @updated 2026-01-06
 */
export const envSchema = z.object({
  // Application environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),
  
  // Database configuration
  DB_HOST : z.string().default("localhost"),
  DB_PORT : z.coerce.number().default(5432),
  DB_USER : z.string().min(1, "DB_USER is required").default("postgres"),
  DB_PASSWORD : z.string().optional().default(""),
  DB_NAME : z.string().min(1, "DB_NAME is required").default("heron_wellnest_db"),

  // Security
  JWT_SECRET: z.string().min(32).optional(), // for HS256
  JWT_PRIVATE_KEY: z.string().optional(), // for RS256
  JWT_PUBLIC_KEY: z.string().optional(),  // for RS256
  JWT_ISSUER: z.string().default("heron-wellnest-auth-api"),
  JWT_AUDIENCE: z.string().default("heron-wellnest-users"),
  JWT_ALGORITHM: z.enum(["HS256", "RS256"]).default("HS256"),
  // CORS_ORIGIN: z.string().url(),

  // Encryption
  MESSAGE_CONTENT_ENCRYPTION_KEY: z.string().min(32, "CONTENT_ENCRYPTION_KEY must be at least 32 characters"),
  MESSAGE_CONTENT_ENCRYPTION_ALGORITHM: z.enum(["aes-256-gcm"]).default("aes-256-gcm"),
  MESSAGE_CONTENT_ENCRYPTION_IV_LENGTH: z.coerce.number().default(16), // in bytes
  MESSAGE_CONTENT_ENCRYPTION_KEY_LENGTH: z.coerce.number().default(32), // in bytes

  // Pub/Sub
  // PUBSUB_CHAT_BOT_TOPIC: z.string().min(1, "PUBSUB_CHAT_BOT_TOPIC is required"),
  PUBSUB_AUDIENCE: z.string().url("PUBSUB_AUDIENCE must be a valid URL"),
  PUBSUB_SERVICE_ACCOUNT_EMAIL: z.string().email("PUBSUB_SERVICE_ACCOUNT_EMAIL must be a valid email"),

  // Email provider
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required when using Resend").optional(),
  RESEND_DEFAULT_FROM: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: booleanFromEnv.optional(),
  SMTP_DEFAULT_FROM: z.string().optional(),

  CORS_ALLOWED_ORIGINS: z.string().optional(), // Comma-separated list of allowed origins for CORS
}).superRefine((env, ctx) => {
  if (env.JWT_ALGORITHM === "HS256" && !env.JWT_SECRET) {
    ctx.addIssue({
      path: ["JWT_SECRET"],
      message: "JWT_SECRET is required when using HS256",
      code: z.ZodIssueCode.custom,
    });
  }

  if (env.JWT_ALGORITHM === "RS256") {
    if (!env.JWT_PRIVATE_KEY) {
      ctx.addIssue({
        path: ["JWT_PRIVATE_KEY_PATH"],
        message: "JWT_PRIVATE_KEY_PATH is required when using RS256",
        code: z.ZodIssueCode.custom,
      });
    }
    if (!env.JWT_PUBLIC_KEY) {
      ctx.addIssue({
        path: ["JWT_PUBLIC_KEY_PATH"],
        message: "JWT_PUBLIC_KEY_PATH is required when using RS256",
        code: z.ZodIssueCode.custom,
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

