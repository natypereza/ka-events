/* GET /api/session → { signedIn, ready }
   Used by the pages to decide whether to let you stay. */

import { isValidSession, readCookie, COOKIE, hasDatabase } from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!hasDatabase()) {
    return res.status(200).json({ signedIn: false, ready: false });
  }

  try {
    const signedIn = await isValidSession(readCookie(req, COOKIE));
    return res.status(200).json({ signedIn, ready: true });
  } catch (err) {
    return res.status(200).json({ signedIn: false, ready: false });
  }
}
