import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Twilio SMS webhook — handles inbound messages (STOP/START replies).
 *
 * Configure in Twilio console: Phone Number → Messaging → "A message comes in"
 * URL: https://<your-convex-deployment>.convex.site/twilio/sms
 * Method: POST
 *
 * Twilio sends form-urlencoded POST with Body and From fields.
 * We respond with empty TwiML to acknowledge without replying
 * (Twilio handles STOP/START auto-replies at the carrier level).
 */
http.route({
  path: "/twilio/sms",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.text();
    const params = new URLSearchParams(formData);
    const body = (params.get("Body") ?? "").trim().toUpperCase();
    const from = params.get("From") ?? "";

    // Normalize phone: strip +1 prefix to get 10-digit US number
    const digits = from.replace(/\D/g, "");
    const normalized =
      digits.length === 11 && digits.startsWith("1")
        ? digits.slice(1)
        : digits;

    if (body === "STOP" || body === "UNSUBSCRIBE" || body === "CANCEL" || body === "QUIT") {
      await ctx.runMutation(internal.sitterSmsQueries.optOutByPhone, {
        phone: normalized,
      });
    } else if (body === "START" || body === "SUBSCRIBE" || body === "YES" || body === "UNSTOP") {
      await ctx.runMutation(internal.sitterSmsQueries.optInByPhone, {
        phone: normalized,
      });
    }

    // Return empty TwiML response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      },
    );
  }),
});

export default http;
