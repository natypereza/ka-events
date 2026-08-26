/* Saved quotes — KA Event & Design

   The history lives in this browser's localStorage. It is not sent
   anywhere and it is not shared between computers: whoever opens the
   page on this machine, in this browser, sees this history. */

const STORE_KEY = "ka_quotes";

function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];   // unreadable or blocked storage: behave as if empty
  }
}

function writeQuotes(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    return false;   // storage full or blocked
  }
}

// Newest first
function addQuote(quote) {
  const list = loadQuotes();
  list.unshift(quote);
  return writeQuotes(list);
}

function deleteQuote(id) {
  return writeQuotes(loadQuotes().filter((q) => q.id !== id));
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
