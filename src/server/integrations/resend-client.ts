import type { ExecutiveEmailInput } from "@/server/ports";
import { providerFetch } from "@/server/integrations/http";

type ResendResponse = {
  id?: string;
};

export async function sendExecutiveEmailWithResend(input: ExecutiveEmailInput) {
  const token = process.env.RESEND_API_KEY;
  const from = process.env.EXECUTIVE_EMAIL_FROM;
  const to = process.env.EXECUTIVE_EMAIL_TO;

  if (!token || !from || !to) {
    return null;
  }

  if (input.dryRun) {
    return {
      id: `resend_draft_${crypto.randomUUID()}`,
    };
  }

  const response = await providerFetch("resend", "https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      to: to.split(",").map((email) => email.trim()).filter(Boolean),
      subject: input.subject,
      text: input.body,
    }),
    headers: {
      authorization: `Bearer ${token}`,
    },
    method: "POST",
  });

  return (await response.json()) as ResendResponse;
}
