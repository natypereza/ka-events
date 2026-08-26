/* Quote form — KA Event & Design */

/* ---- Price list (Guatemalan quetzales) ----
   The extra-hour rate lives in the form so it can be changed per
   quote; Q500.00 is only the starting value. */
const PRICES = {
  planner: { label: "Planner / Coordination", amount: 3500 },
  dayOf:   { label: "Day of Event (5h base)", amount: 2800 }
};

const form    = document.getElementById("quoteForm");
const errorEl = document.getElementById("formError");
const quote   = document.getElementById("quote");
const savedEl = document.getElementById("savedNote");

document.getElementById("btnLogout").addEventListener("click", signOut);

/* money(), longDate() and clockTime() come from js/store.js, which both
   this page and the history page share. */

function row(label, amount, className) {
  const tr = document.createElement("tr");
  if (className) tr.className = className;

  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = label;

  const td = document.createElement("td");
  td.className = "num";
  td.textContent = amount;

  tr.append(th, td);
  return tr;
}


/* ===== Decoration items ===== */

const chkDecoration = document.getElementById("chkDecoration");
const decorSection  = document.getElementById("decorSection");
const decorList     = document.getElementById("decorList");

// Reads every decoration row currently on screen
function readDecorItems() {
  return Array.from(decorList.querySelectorAll(".decor-row")).map((r) => {
    const qty   = Number(r.querySelector(".decor-qty").value) || 0;
    const desc  = r.querySelector(".decor-desc").value.trim();
    const price = Number(r.querySelector(".decor-price").value) || 0;
    return { row: r, qty, desc, price, amount: qty * price };
  });
}

// Refreshes each row's amount and the decoration subtotal
function refreshDecorTotals() {
  const items = readDecorItems();

  items.forEach((item) => {
    item.row.querySelector(".decor-line").textContent = money(item.amount);
  });

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById("decorTotal").textContent = money(total);
}

function addDecorRow() {
  const r = document.createElement("div");
  r.className = "decor-row";
  r.innerHTML =
    '<input type="number" class="input decor-qty" min="1" step="1" value="1" aria-label="Quantity">' +
    '<input type="text" class="input decor-desc" placeholder="Description" aria-label="Description">' +
    '<input type="number" class="input decor-price" min="0" step="0.01" placeholder="0.00" aria-label="Unit price">' +
    '<span class="decor-line">Q0.00</span>' +
    '<button type="button" class="row-remove" aria-label="Remove item">&times;</button>';

  decorList.appendChild(r);
  refreshDecorTotals();
  r.querySelector(".decor-desc").focus();
}

// Show or hide the section with the checkbox
chkDecoration.addEventListener("change", () => {
  decorSection.hidden = !chkDecoration.checked;

  if (chkDecoration.checked && decorList.children.length === 0) {
    addDecorRow();
  }
});

document.getElementById("btnAddItem").addEventListener("click", addDecorRow);

// Live totals as you type
decorList.addEventListener("input", refreshDecorTotals);

// Remove a row (always keep at least one)
decorList.addEventListener("click", (e) => {
  const btn = e.target.closest(".row-remove");
  if (!btn) return;

  if (decorList.children.length > 1) {
    btn.closest(".decor-row").remove();
  } else {
    btn.closest(".decor-row")
       .querySelectorAll("input")
       .forEach((i) => { i.value = i.classList.contains("decor-qty") ? "1" : ""; });
  }
  refreshDecorTotals();
});

/* ===== Inspiration images =====
   Pictures are scaled down in the browser before being kept, so a
   quote with several photos still prints quickly. */

const MAX_SIDE = 1400;   // longest side, in pixels
const thumbs   = document.getElementById("thumbs");
const images   = [];     // data URLs, in the order they were added

document.getElementById("btnAddImages").addEventListener("click", () => {
  document.getElementById("imageInput").click();
});

document.getElementById("imageInput").addEventListener("change", (e) => {
  Array.from(e.target.files)
    .filter((file) => file.type.startsWith("image/"))
    .forEach(storeImage);

  e.target.value = "";   // so the same file can be picked again later
});

function storeImage(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const img = new Image();

    img.onload = () => {
      const scale  = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

      images.push(canvas.toDataURL("image/jpeg", 0.85));
      renderThumbs();
    };

    img.onerror = () => {
      errorEl.textContent = "That file could not be read as an image.";
    };

    img.src = reader.result;
  };

  reader.readAsDataURL(file);
}

function renderThumbs() {
  thumbs.textContent = "";

  images.forEach((src, i) => {
    const fig = document.createElement("div");
    fig.className = "thumb";

    const img = document.createElement("img");
    img.src = src;
    img.alt = "Inspiration image " + (i + 1);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb-remove";
    btn.dataset.index = i;
    btn.setAttribute("aria-label", "Remove image " + (i + 1));
    btn.innerHTML = "&times;";

    fig.append(img, btn);
    thumbs.appendChild(fig);
  });
}

thumbs.addEventListener("click", (e) => {
  const btn = e.target.closest(".thumb-remove");
  if (!btn) return;

  images.splice(Number(btn.dataset.index), 1);
  renderThumbs();
});


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  savedEl.textContent = "";

  const client      = document.getElementById("client").value.trim();
  const phone       = document.getElementById("phone").value.trim();
  const eventName   = document.getElementById("eventName").value.trim();
  const guests      = document.getElementById("guests").value;
  const date        = document.getElementById("date").value;
  const venue       = document.getElementById("venue").value.trim();
  const startTime   = document.getElementById("startTime").value;
  const endTime     = document.getElementById("endTime").value;
  const description = document.getElementById("description").value.trim();
  const extraHours  = Number(document.getElementById("extraHours").value) || 0;
  const hourRate    = Number(document.getElementById("hourRate").value) || 0;
  const discount    = Number(document.getElementById("discount").value) || 0;
  const notes       = document.getElementById("notes").value.trim();

  const services = Array.from(
    form.querySelectorAll('input[name="service"]:checked')
  ).map((c) => c.value);

  /* ---- Validation ---- */
  if (!client) {
    errorEl.textContent = "Please enter the client name.";
    return;
  }
  if (!phone) {
    errorEl.textContent = "Please enter the client's phone number.";
    return;
  }
  if (!eventName) {
    errorEl.textContent = "Please enter the event name.";
    return;
  }
  if (!guests || Number(guests) < 1) {
    errorEl.textContent = "Please enter the number of guests.";
    return;
  }
  if (!date) {
    errorEl.textContent = "Please select the event date.";
    return;
  }
  if (services.length === 0) {
    errorEl.textContent = "Please choose at least one service.";
    return;
  }
  if (extraHours < 0) {
    errorEl.textContent = "Extra hours cannot be negative.";
    return;
  }
  if (extraHours > 0 && hourRate <= 0) {
    errorEl.textContent = "Please enter the rate per extra hour.";
    return;
  }

  // Decoration items: keep only the rows that are actually filled in
  const decorItems = services.includes("decoration")
    ? readDecorItems().filter((item) => item.desc !== "" || item.price > 0)
    : [];

  if (services.includes("decoration")) {
    if (decorItems.length === 0) {
      errorEl.textContent = "Please add at least one decoration item.";
      return;
    }
    if (decorItems.some((item) => item.desc === "")) {
      errorEl.textContent = "Every decoration item needs a description.";
      return;
    }
    if (decorItems.some((item) => item.qty < 1 || item.price <= 0)) {
      errorEl.textContent = "Every decoration item needs a quantity and a price.";
      return;
    }
  }

  /* ---- Event details ---- */
  document.getElementById("qClient").textContent    = client;
  document.getElementById("qEventName").textContent = eventName;
  document.getElementById("qGuests").textContent =
    guests + (Number(guests) === 1 ? " guest" : " guests");
  document.getElementById("qPhone").textContent = phone;
  document.getElementById("qDate").textContent  = longDate(date);

  document.getElementById("qDescription").textContent   = description;
  document.getElementById("qDescriptionWrap").hidden    = description === "";

  // Schedule: both times, or just the one that was filled in
  let schedule = "";
  if (startTime && endTime) {
    schedule = clockTime(startTime) + " – " + clockTime(endTime);
  } else if (startTime) {
    schedule = "From " + clockTime(startTime);
  } else if (endTime) {
    schedule = "Until " + clockTime(endTime);
  }

  document.getElementById("qSchedule").textContent = schedule;
  document.getElementById("qScheduleWrap").hidden  = schedule === "";

  document.getElementById("qVenue").textContent = venue;
  document.getElementById("qVenueWrap").hidden  = venue === "";

  const notesWrap = document.getElementById("qNotesWrap");
  document.getElementById("qNotes").textContent = notes;
  notesWrap.hidden = notes === "";

  /* ---- Line items ---- */
  const items = services
    .filter((key) => PRICES[key])          // decoration is priced per item
    .map((key) => ({
      label:  PRICES[key].label,
      amount: PRICES[key].amount
    }));

  if (extraHours > 0) {
    items.push({
      label: "Extra hours (" + extraHours + " × " + money(hourRate) + ")",
      amount: extraHours * hourRate
    });
  }

  /* Decoration is listed under its own heading. The items show only the
     description and quantity — the client sees one closing amount, not a
     price per item. */
  if (decorItems.length > 0) {
    items.push({ heading: "Decoration" });

    decorItems.forEach((item) => {
      items.push({ label: item.desc + "  (" + item.qty + ")", item: true });
    });

    const included = Array.from(
      form.querySelectorAll('input[name="include"]:checked')
    ).map((c) => c.value);

    if (included.length > 0) {
      items.push({ label: "Includes: " + included.join(", "), note: true });
    }

    items.push({
      groupTotal: true,
      amount: decorItems.reduce((sum, item) => sum + item.amount, 0)
    });
  }

  const itemsBody = document.getElementById("qItems");
  itemsBody.textContent = "";

  items.forEach((item) => {
    if (item.heading) {
      itemsBody.appendChild(row(item.heading, "", "group"));
    } else if (item.groupTotal) {
      itemsBody.appendChild(row("", money(item.amount), "group-total"));
    } else if (item.note) {
      itemsBody.appendChild(row(item.label, "", "item note"));
    } else if (item.item) {
      itemsBody.appendChild(row(item.label, "", "item"));
    } else {
      itemsBody.appendChild(row(item.label, money(item.amount)));
    }
  });

  /* ---- Totals ---- */
  const subtotal       = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const discountAmount = subtotal * (discount / 100);
  const total          = subtotal - discountAmount;

  const totals = document.getElementById("qTotals");
  totals.textContent = "";

  if (discount > 0) {
    totals.appendChild(row("Subtotal", money(subtotal), "sub"));
    totals.appendChild(row("Discount (" + discount + "%)", "− " + money(discountAmount), "sub"));
  }
  totals.appendChild(row("Total", money(total), "total"));

  /* ---- Inspiration images ---- */
  const inspo     = document.getElementById("qInspo");
  const inspoGrid = document.getElementById("qInspoGrid");

  inspoGrid.textContent = "";
  images.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Inspiration image " + (i + 1);
    inspoGrid.appendChild(img);
  });
  inspo.hidden = images.length === 0;

  const issuedAt = new Date();

  document.getElementById("qIssued").textContent =
    "Issued on " + issuedAt.toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });

  quote.hidden = false;
  quote.scrollIntoView({ behavior: "smooth", block: "start" });

  /* ---- Save this quote to the history ----
     It goes to the database on the server, so it stays there for good.
     Everything is kept, including the unit price of each decoration
     item. The inspiration photos are not: they belong to the PDF. */
  const record = {
    id:        "q" + issuedAt.getTime(),
    issuedAt:  issuedAt.toISOString(),
    client, phone, eventName, guests: Number(guests), date, venue,
    startTime, endTime, schedule, description, notes,
    services,
    decorItems: decorItems.map((item) => ({
      qty:    item.qty,
      desc:   item.desc,
      price:  item.price,
      amount: item.amount
    })),
    includes: Array.from(
      form.querySelectorAll('input[name="include"]:checked')
    ).map((c) => c.value),
    extraHours, hourRate, discount,
    subtotal, discountAmount, total,
    imageCount: images.length
  };

  savedEl.textContent = "Saving to history…";
  savedEl.className   = "saved-note";

  try {
    await addQuote(record);
    savedEl.textContent = "Saved to history.";
  } catch (err) {
    savedEl.textContent =
      "The quote is ready, but it could NOT be saved to the history: " +
      err.message + " — save the PDF so you do not lose it.";
    savedEl.className = "saved-note is-error";
  }
});

// Clearing the form hides the quote, the decoration rows and the images
form.addEventListener("reset", () => {
  quote.hidden = true;
  errorEl.textContent = "";

  // The reset happens after this handler, so wait a tick
  setTimeout(() => {
    decorList.textContent = "";
    decorSection.hidden = true;
    refreshDecorTotals();

    images.length = 0;
    renderThumbs();
  }, 0);
});

document.getElementById("btnPrint").addEventListener("click", () => {
  window.print();
});
