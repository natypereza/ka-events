/* Saved quotes — KA Event & Design

   Quotes live in a database on the server, not in this browser. They
   survive clearing your history, and you see the same list from any
   computer or phone once you enter the code. */

async function api(path, options) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (res.status === 401) {
    // The session expired or was never there
    window.location.replace("index.html");
    throw new Error("Not signed in");
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error || "Request failed (" + res.status + ")");
  }
  return body;
}

// Newest first, straight from the server
async function loadQuotes() {
  const list = await api("/api/quotes");
  return Array.isArray(list) ? list : [];
}

async function addQuote(quote) {
  await api("/api/quotes", { method: "POST", body: JSON.stringify(quote) });
}

async function deleteQuote(id) {
  await api("/api/quotes?id=" + encodeURIComponent(id), { method: "DELETE" });
}

// Used by the history import, one quote at a time
async function saveMany(quotes) {
  for (const quote of quotes) await addQuote(quote);
}

async function signOut() {
  try {
    await fetch("/api/login", { method: "DELETE", credentials: "same-origin" });
  } catch (err) { /* leaving anyway */ }
  window.location.href = "index.html";
}


/* ---- Shared formatting, used by both pages ---- */

// Q1,234.00
function money(value) {
  return "Q" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// "Saturday, September 12, 2026"
function longDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

// "5:00 PM" from a 24h "17:00"
function clockTime(value) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour   = h % 12 === 0 ? 12 : h % 12;
  return hour + ":" + String(m).padStart(2, "0") + " " + suffix;
}
