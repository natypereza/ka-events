/* Quote history — KA Event & Design */

const SERVICE_LABELS = {
  planner:    "Planner / Coordination",
  dayOf:      "Day of Event (5h base)",
  decoration: "Decoration"
};

const listEl   = document.getElementById("list");
const emptyEl  = document.getElementById("empty");
const countEl  = document.getElementById("count");
const searchEl = document.getElementById("search");

document.getElementById("btnLogout").addEventListener("click", () => {
  try {
    sessionStorage.removeItem("ka_access");
  } catch (err) { /* sessionStorage unavailable */ }
  window.location.href = "index.html";
});

// "August 25, 2026"
function issuedDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// One "Label / value" line inside the detail panel
function detail(label, value) {
  const wrap = el("div", "h-detail");
  wrap.append(el("dt", null, label), el("dd", null, value));
  return wrap;
}

function decorTable(items) {
  const table = el("table", "h-table");

  const head = el("tr");
  ["Qty", "Description", "Unit price", "Amount"].forEach((h, i) => {
    const th = el("th", i > 1 ? "num" : null, h);
    th.scope = "col";
    head.appendChild(th);
  });
  table.appendChild(el("thead")).appendChild(head);

  const body = el("tbody");
  items.forEach((item) => {
    const tr = el("tr");
    tr.append(
      el("td", null, String(item.qty)),
      el("td", null, item.desc),
      el("td", "num", money(item.price)),
      el("td", "num", money(item.amount))
    );
    body.appendChild(tr);
  });
  table.appendChild(body);

  const foot = el("tr", "h-table-total");
  const label = el("td", null, "Decoration total");
  label.colSpan = 3;
  foot.append(
    label,
    el("td", "num", money(items.reduce((sum, i) => sum + i.amount, 0)))
  );
  table.appendChild(el("tfoot")).appendChild(foot);

  return table;
}

function card(quote) {
  const box = el("details", "h-card");

  /* ---- Collapsed header ---- */
  const head = el("summary", "h-head");

  const main = el("div", "h-head-main");
  main.append(
    el("span", "h-event", quote.eventName),
    el("span", "h-client", quote.client + " · " + quote.phone)
  );

  const side = el("div", "h-head-side");
  side.append(
    el("span", "h-total", money(quote.total)),
    el("span", "h-issued", "Issued " + issuedDate(quote.issuedAt))
  );

  head.append(main, side);
  box.appendChild(head);

  /* ---- Expanded body ---- */
  const body = el("div", "h-body");
  const dl   = el("dl", "h-details");

  dl.append(
    detail("Event date", longDate(quote.date)),
    detail("Guests", quote.guests + (quote.guests === 1 ? " guest" : " guests"))
  );

  if (quote.schedule) dl.appendChild(detail("Schedule", quote.schedule));
  if (quote.venue)    dl.appendChild(detail("Venue", quote.venue));

  dl.appendChild(detail(
    "Services",
    quote.services.map((s) => SERVICE_LABELS[s] || s).join(" · ")
  ));

  if (quote.extraHours > 0) {
    dl.appendChild(detail(
      "Extra hours",
      quote.extraHours + " × " + money(quote.hourRate) +
        "  =  " + money(quote.extraHours * quote.hourRate)
    ));
  }

  if (quote.includes && quote.includes.length > 0) {
    dl.appendChild(detail("Included", quote.includes.join(", ")));
  }

  if (quote.description) dl.appendChild(detail("Description", quote.description));
  if (quote.notes)       dl.appendChild(detail("Notes", quote.notes));

  if (quote.imageCount > 0) {
    dl.appendChild(detail(
      "Inspiration images",
      quote.imageCount + (quote.imageCount === 1 ? " image" : " images") +
        " were attached to the PDF (not stored here)"
    ));
  }

  body.appendChild(dl);

  if (quote.decorItems && quote.decorItems.length > 0) {
    body.append(el("h3", "h-subtitle", "Decoration items"), decorTable(quote.decorItems));
  }

  /* ---- Money summary ---- */
  const sum = el("dl", "h-sum");
  sum.appendChild(detail("Subtotal", money(quote.subtotal)));

  if (quote.discount > 0) {
    sum.appendChild(detail(
      "Discount (" + quote.discount + "%)",
      "− " + money(quote.discountAmount)
    ));
  }

  const totalLine = el("div", "h-detail h-detail-total");
  totalLine.append(el("dt", null, "Total"), el("dd", null, money(quote.total)));
  sum.appendChild(totalLine);

  body.appendChild(sum);

  const del = el("button", "link-btn h-delete", "Delete this quote");
  del.type = "button";
  del.dataset.id = quote.id;
  body.appendChild(del);

  box.appendChild(body);
  return box;
}

function render() {
  const term   = searchEl.value.trim().toLowerCase();
  const all    = loadQuotes();
  const shown  = term
    ? all.filter((q) =>
        [q.client, q.phone, q.eventName, q.venue]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(term)))
    : all;

  listEl.textContent = "";
  shown.forEach((quote) => listEl.appendChild(card(quote)));

  emptyEl.hidden = all.length > 0;

  if (all.length === 0) {
    countEl.textContent = "No quotes yet";
  } else if (term) {
    countEl.textContent =
      shown.length + " of " + all.length + " quotes";
  } else {
    countEl.textContent =
      all.length + (all.length === 1 ? " quote saved" : " quotes saved");
  }
}

searchEl.addEventListener("input", render);


/* ===== Backup =====
   The history lives in this browser, tied to this exact web address.
   Exporting writes it to a file you can keep, or load on another
   computer, browser or address. */

const msgEl = document.getElementById("msg");

function say(text, isError) {
  msgEl.textContent = text;
  msgEl.classList.toggle("is-error", Boolean(isError));
}

document.getElementById("btnExport").addEventListener("click", () => {
  const list = loadQuotes();

  if (list.length === 0) {
    say("There is nothing to export yet.", true);
    return;
  }

  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");

  a.href = url;
  a.download = "ka-quotes-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  say(list.length + (list.length === 1 ? " quote exported." : " quotes exported."));
});

document.getElementById("btnImport").addEventListener("click", () => {
  document.getElementById("importInput").click();
});

document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    let incoming;

    try {
      incoming = JSON.parse(reader.result);
    } catch (err) {
      say("That file is not a valid backup.", true);
      return;
    }

    if (!Array.isArray(incoming)) {
      say("That file is not a valid backup.", true);
      return;
    }

    // Merge instead of replace, so an import never erases what is here
    const current = loadQuotes();
    const seen    = new Set(current.map((q) => q.id));
    const added   = incoming.filter((q) => q && q.id && !seen.has(q.id));

    const merged = current
      .concat(added)
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

    if (!writeQuotes(merged)) {
      say("Could not save: the browser storage is full or blocked.", true);
      return;
    }

    render();

    const skipped = incoming.length - added.length;
    say(
      added.length + (added.length === 1 ? " quote imported" : " quotes imported") +
      (skipped > 0 ? ", " + skipped + " already here" : "") + "."
    );
  };

  reader.onerror = () => say("That file could not be read.", true);
  reader.readAsText(file);
});

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".h-delete");
  if (!btn) return;

  if (confirm("Delete this quote from the history? This cannot be undone.")) {
    deleteQuote(btn.dataset.id);
    render();
  }
});

render();
