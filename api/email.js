/* POST /api/email  { quote, images }
   Builds the quote PDF and mails it, with the PDF attached.

   Needs three environment variables in Vercel:
     GMAIL_USER          the Gmail address that sends
     GMAIL_APP_PASSWORD  a Google App Password (not the normal one)
     QUOTE_EMAIL_TO      where the quote is sent */

import nodemailer from "nodemailer";
import { requireSession } from "./_db.js";
import { buildQuotePdf } from "./_pdf.js";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } }   // the photos travel in the body
};

function safeName(text) {
  return String(text).replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await requireSession(req, res))) return;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to   = process.env.QUOTE_EMAIL_TO;

  if (!user || !pass || !to) {
    return res.status(503).json({
      error: "Email is not configured yet (missing GMAIL_USER, " +
             "GMAIL_APP_PASSWORD or QUOTE_EMAIL_TO)."
    });
  }

  try {
    const { quote, images } = req.body || {};

    if (!quote || !quote.client || !quote.eventName) {
      return res.status(400).json({ error: "Malformed quote" });
    }

    const pdf = await buildQuotePdf(quote, Array.isArray(images) ? images : []);

    // Subject and file name are both "Client - Event"
    const name = safeName(quote.client + " - " + quote.eventName);

    const lines = [
      "Client:   " + quote.client,
      "Phone:    " + quote.phone,
      "Event:    " + quote.eventName,
      "Date:     " + (quote.dateLabel || quote.date),
      quote.schedule ? "Schedule: " + quote.schedule : null,
      quote.venue    ? "Venue:    " + quote.venue    : null,
      "Guests:   " + quote.guests,
      "",
      "Total:    Q" + Number(quote.total).toLocaleString("en-US", {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }),
      "",
      "The full quote is attached as a PDF."
    ].filter(Boolean);

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });

    await transport.sendMail({
      from: '"KA Event & Design" <' + user + ">",
      to,
      subject: name,
      text: lines.join("\n"),
      attachments: [{
        filename: name + ".pdf",
        content: pdf,
        contentType: "application/pdf"
      }]
    });

    return res.status(200).json({ ok: true, to });
  } catch (err) {
    return res.status(500).json({ error: "Could not send: " + err.message });
  }
}
