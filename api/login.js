/* POST /api/login  { code }  → sets the session cookie
   DELETE /api/login          → signs out */

import {
  init, accessCode, newSession, sessionCookie, clearCookie, hasDatabase
} from "./_db.js";

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasDatabase()) {
    return res.status(503).json({
      error: "No database is connected yet, so quotes cannot be saved."
    });
  }

  try {
    await init();

    const code = (req.body && req.body.code ? String(req.body.code) : "").trim();

    if (code !== (await accessCode())) {
      return res.status(401).json({ error: "Incorrect code" });
    }

    res.setHeader("Set-Cookie", sessionCookie(await newSession()));
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
