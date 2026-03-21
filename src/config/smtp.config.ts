import nodemailer, { type SentMessageInfo } from "nodemailer";

import { env } from "./env.config.js";
import { AppError } from "../types/appError.type.js";

type TemplateVariables = Record<string, string | number>;

type SmtpEmailBody =
  | {
      html: string;
      template?: never;
      variables?: never;
    }
  | {
      html?: never;
      template: string;
      variables?: TemplateVariables;
    };

export type SendSmtpEmailInput = SmtpEmailBody & {
  from?: string;
  to: string | string[];
  subject: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
};

function resolveHtmlBody(input: SmtpEmailBody): string {
  if ("html" in input && typeof input.html === "string") {
    return input.html;
  }

  return renderHtmlTemplate(input.template, input.variables);
}

/**
 * Replaces {{key}} placeholders in an HTML template with the provided values.
 */
export function renderHtmlTemplate(template: string, variables: TemplateVariables = {}): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key: string) => {
    if (!(key in variables)) {
      return match;
    }

    return String(variables[key]);
  });
}

/**
 * Sends an email via SMTP with either raw HTML or a variable-driven HTML template.
 */
export async function sendSmtpEmail(input: SendSmtpEmailInput): Promise<SentMessageInfo> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new AppError(
      500,
      "SMTP_NOT_CONFIGURED",
      "SMTP config is missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
      true
    );
  }

  const from = input.from ?? env.SMTP_DEFAULT_FROM;

  if (!from) {
    throw new AppError(
      500,
      "FAILED_TO_SEND_EMAIL",
      "Missing sender address. Provide 'from' or set SMTP_DEFAULT_FROM.",
      true
    );
  }

  const html = resolveHtmlBody(input);

  // Use explicit override when provided, otherwise infer from common SMTP ports.
  const isSecure = env.SMTP_SECURE ?? env.SMTP_PORT === 465;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: isSecure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    requireTLS: !isSecure,
  });

  return await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html,
    cc: input.cc,
    bcc: input.bcc,
    replyTo: input.replyTo,
  });
}
