type BuildAppEmailTemplateInput = {
  topic: string;
  message: string;
};

/**
 * Builds a reusable HTML email layout for Heron Wellnest notifications.
 */
export function buildAppEmailTemplate({ topic, message }: BuildAppEmailTemplateInput): string {
  const escapedTopic = escapeHtml(topic);
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br />");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapedTopic}</title>
    <style>
      @media only screen and (max-width: 420px) {
        .banner-row {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        .content-cell {
          padding: 18px !important;
        }

        .email-title {
          font-size: 20px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: #29384f; font-family: Arial, Helvetica, sans-serif; color: #272727;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 12px; background: #ffffff;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #29384f; border-radius: 14px; overflow: hidden; border: 1px solid #54dad1;">
            <tr class="banner-row">
              <td>
                <img
                  src="https://storage.googleapis.com/web-static-resource/email/Frame%2010.jpg"
                  alt="Heron Wellnest banner"
                  width="640"
                  style="display: block; width: 100%; height: auto; border: 0;"
                />
              </td>
            </tr>
            <tr>
              <td class="content-cell" style="padding: 24px; background: linear-gradient(135deg, #29384f, #54dad1); color: #fbf3ea;">
                <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.95;">Heron Wellnest</p>
                <h1 class="email-title" style="margin: 8px 0 0; font-size: 22px; line-height: 1.3;">${escapedTopic}</h1>
              </td>
            </tr>
            <tr>
              <td class="content-cell" style="padding: 24px; background: #fbf3ea;">
                <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #272727;">${escapedMessage}</p>
              </td>
            </tr>
            <tr>
              <td class="content-cell" style="padding: 16px 24px 24px; border-top: 1px solid #54dad1; background: #fbf3ea;">
                <p style="margin: 0; font-size: 12px; color: #29384f;">This email was sent by Heron Wellnest Notification Service.</p>
                <p style="margin: 8px 0 0; font-size: 12px; color: #ff7517;">Please do not reply directly to this message.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
