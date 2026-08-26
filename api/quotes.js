/* GET    /api/quotes      → every saved quote, newest first
   POST   /api/quotes      → saves one quote
   DELETE /api/quotes?id=  → deletes one quote

   All three require a valid session cookie. */

import { db, init, requireSession, hasDatabase } from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!hasDatabase()) {
    return res.status(503).json({
      error: "No database is connected to this project yet."
    });
  }

  if (!(await requireSession(req, res))) return;

  try {
    await init();
    const sql = db();

    if (req.method === "GET") {
      const rows = await sql`
        SELECT data FROM quotes ORDER BY issued_at DESC`;
      return res.status(200).json(rows.map((r) => r.data));
    }

    if (req.method === "POST") {
      const quote = req.body;

      if (!quote || !quote.id || !quote.issuedAt) {
        return res.status(400).json({ error: "Malformed quote" });
      }

      await sql`
        INSERT INTO quotes (id, issued_at, data)
        VALUES (${quote.id}, ${quote.issuedAt}, ${JSON.stringify(quote)})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;

      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing id" });

      await sql`DELETE FROM quotes WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
