import { Resend, type CreateEmailResponseSuccess } from "resend";

import { env } from "./env.config.js";
import { AppError } from "../types/appError.type.js";

type TemplateVariables = Record<string, string | number>;

type ResendEmailBody =
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

export type SendEmailInput = ResendEmailBody & {
	from?: string;
	to: string | string[];
	subject: string;
	cc?: string | string[];
	bcc?: string | string[];
	replyTo?: string | string[];
};

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function resolveHtmlBody(input: ResendEmailBody): string {
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
 * Sends an email via Resend with either raw HTML or a variable-driven HTML template.
 */
export async function sendEmail(input: SendEmailInput): Promise<CreateEmailResponseSuccess> {
	if (!resendClient) {
		throw new Error("RESEND_API_KEY is not configured.");
	}

	const from = input.from ?? env.RESEND_DEFAULT_FROM;

	if (!from) {
		throw new AppError(
            200,
            "FAILED_TO_SEND_EMAIL",
            "Missing sender address. Provide 'from' or set RESEND_DEFAULT_FROM.",
            true
        );
	}

	const html = resolveHtmlBody(input);

	const { data, error } = await resendClient.emails.send({
		from,
		to: input.to,
		subject: input.subject,
		html,
		cc: input.cc,
		bcc: input.bcc,
		replyTo: input.replyTo,
	});

	if (error) {
		throw new Error(`Resend send failed: ${error.message}`);
	}

	return data;
}

