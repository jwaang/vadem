"use node";

import { Resend } from "resend";

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const from = process.env.EMAIL_FROM ?? "Vadem <noreply@vadem.app>";
  const link = `${appUrl}/verify-email?token=${token}`;

  await new Resend(key).emails.send({
    from,
    to: email,
    subject: "Verify your Vadem email",
    html: buildVerificationHtml(link),
  });
}

function buildVerificationHtml(link: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:48px auto;padding:0 16px">
    <p style="text-align:center;font-size:26px;color:#C2704A;font-style:italic;margin:0 0 32px;font-family:Georgia,serif">Vadem</p>
    <div style="background:#ffffff;border-radius:14px;padding:40px;box-shadow:0 2px 12px rgba(42,31,26,.08)">
      <h1 style="margin:0 0 12px;font-size:22px;color:#2A1F1A;font-weight:600;line-height:1.3">Confirm your email address</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6B5A50;line-height:1.6">
        Thanks for signing up for Vadem. Click the button below to verify your email address and get started.
        This link expires in 24 hours.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#C2704A;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.01em">
        Verify email
      </a>
      <p style="margin:28px 0 0;font-size:13px;color:#A89890;line-height:1.5">
        If you didn't create a Vadem account, you can safely ignore this email.
        If you're having trouble clicking the button, copy and paste this URL into your browser:
        <br>
        <span style="color:#C2704A;word-break:break-all">${link}</span>
      </p>
    </div>
    <p style="text-align:center;margin:24px 0 0;font-size:12px;color:#A89890">© ${year} Vadem</p>
  </div>
</body>
</html>`;
}
