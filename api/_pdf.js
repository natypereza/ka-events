/* Builds the quote PDF — KA Event & Design

   Draws the same document you see on screen: black page, cream text,
   the logo centred at the top, the detail rows, the item table with
   the decoration block, the totals, the inspiration images and the
   signature. */

import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const BLACK = rgb(0, 0, 0);
const CREAM = rgb(0.945, 0.937, 0.906);   // #F1EFE7
const DIM   = rgb(0.561, 0.553, 0.525);   // #8F8D86
const LINE  = rgb(0.235, 0.235, 0.224);   // #3C3C39

const PAGE_W  = 595.28;   // A4
const PAGE_H  = 841.89;
const MARGIN  = 44;
const CONTENT = PAGE_W - MARGIN * 2;

function asset(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts));
}

function money(value) {
  return "Q" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* Letter-spaced small caps, used for every label in the design */
function tracked(text, spacing) {
  return String(text).toUpperCase().split("").join(spacing ? " " : "");
}

export async function buildQuotePdf(quote, images = []) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const serif = await doc.embedFont(asset("assets/fonts/cormorant-garamond-400.ttf"), { subset: true });
  const sans  = await doc.embedFont(asset("assets/fonts/jost-300.ttf"), { subset: true });
  const sansM = await doc.embedFont(asset("assets/fonts/jost-400.ttf"), { subset: true });

  const logo = await doc.embedPng(asset("images", "logo-mark.png"));

  let page, y;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BLACK });
    y = PAGE_H - MARGIN;
  }

  function room(needed) {
    if (y - needed < MARGIN) newPage();
  }

  function text(str, opts) {
    page.drawText(String(str), {
      x: opts.x,
      y: opts.y,
      size: opts.size,
      font: opts.font || sans,
      color: opts.color || CREAM
    });
  }

  function textRight(str, opts) {
    const font  = opts.font || sans;
    const width = font.widthOfTextAtSize(String(str), opts.size);
    text(str, { ...opts, x: opts.right - width });
  }

  function rule(atY) {
    page.drawLine({
      start: { x: MARGIN, y: atY },
      end:   { x: PAGE_W - MARGIN, y: atY },
      thickness: 0.5,
      color: LINE
    });
  }

  // Wraps a string to a width, returns the lines
  function wrap(str, font, size, maxWidth) {
    const words = String(str).split(/\s+/);
    const lines = [];
    let line = "";

    for (const word of words) {
      const attempt = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(attempt, size) <= maxWidth) {
        line = attempt;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---- Header ---- */
  newPage();

  const logoW = 104;
  const logoH = (logo.height / logo.width) * logoW;
  page.drawImage(logo, {
    x: (PAGE_W - logoW) / 2,
    y: y - logoH,
    width: logoW,
    height: logoH
  });
  y -= logoH + 38;

  const title = "Quote";
  textRight(title, { right: (PAGE_W + serif.widthOfTextAtSize(title, 26)) / 2, y, size: 26, font: serif });
  y -= 16;

  const issued = "ISSUED ON " + new Date(quote.issuedAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  }).toUpperCase();
  const issuedW = sans.widthOfTextAtSize(tracked(issued, true), 7.5);
  text(tracked(issued, true), { x: (PAGE_W - issuedW) / 2, y, size: 7.5, color: DIM });
  y -= 20;

  rule(y);
  y -= 18;

  /* ---- Event details ---- */
  const LABEL_W = 130;

  function detail(label, value) {
    const lines  = wrap(value, sans, 10.5, CONTENT - LABEL_W);
    const height = Math.max(lines.length * 13, 13) + 11;
    room(height);

    text(tracked(label, true), { x: MARGIN, y: y - 9, size: 7.5, color: DIM });

    lines.forEach((line, i) => {
      text(line, { x: MARGIN + LABEL_W, y: y - 9 - i * 13, size: 10.5 });
    });

    y -= height;
    rule(y + 4);
  }

  detail("Client", quote.client);
  detail("Phone", quote.phone);
  detail("Event", quote.eventName);
  detail("Guests", quote.guests + (Number(quote.guests) === 1 ? " guest" : " guests"));
  detail("Event date", quote.dateLabel || quote.date);
  if (quote.schedule)    detail("Schedule", quote.schedule);
  if (quote.venue)       detail("Venue", quote.venue);
  if (quote.description) detail("Event description", quote.description);
  if (quote.notes)       detail("Notes", quote.notes);

  /* ---- Item table ---- */
  y -= 10;
  room(30);
  text(tracked("Description", true), { x: MARGIN, y: y - 9, size: 7.5, color: DIM });
  textRight(tracked("Amount", true), { right: PAGE_W - MARGIN, y: y - 9, size: 7.5, color: DIM });
  y -= 18;
  rule(y + 3);

  function itemRow(label, amount, indent) {
    room(20);
    text(label, { x: MARGIN + (indent ? 14 : 0), y: y - 11, size: 10 });
    if (amount !== null) {
      textRight(amount, { right: PAGE_W - MARGIN, y: y - 11, size: 10 });
    }
    y -= 20;
    if (amount !== null) rule(y + 4);
  }

  const SERVICE_LABELS = {
    planner: "Planner / Coordination",
    dayOf:   "Day of Event (5h base)"
  };

  (quote.services || []).forEach((key) => {
    if (SERVICE_LABELS[key]) {
      itemRow(SERVICE_LABELS[key], money(key === "planner" ? 3500 : 2800));
    }
  });

  if (quote.extraHours > 0) {
    itemRow(
      "Extra hours (" + quote.extraHours + " × " + money(quote.hourRate) + ")",
      money(quote.extraHours * quote.hourRate)
    );
  }

  const decorItems = quote.decorItems || [];

  if (decorItems.length > 0) {
    room(24);
    y -= 4;
    text(tracked("Decoration", true), { x: MARGIN, y: y - 10, size: 7.5, color: DIM });
    y -= 18;

    // Description and quantity only — the client sees one closing amount
    decorItems.forEach((item) => {
      room(16);
      text(item.desc + "  (" + item.qty + ")", { x: MARGIN + 14, y: y - 10, size: 10 });
      y -= 16;
    });

    if (quote.includes && quote.includes.length > 0) {
      room(16);
      text("Includes: " + quote.includes.join(", "),
           { x: MARGIN + 14, y: y - 10, size: 9, color: DIM });
      y -= 18;
    }

    room(20);
    textRight(money(decorItems.reduce((s, i) => s + i.amount, 0)),
              { right: PAGE_W - MARGIN, y: y - 11, size: 10 });
    y -= 20;
    rule(y + 4);
  }

  /* ---- Totals ---- */
  room(70);

  if (quote.discount > 0) {
    text("Subtotal", { x: MARGIN, y: y - 11, size: 9.5, color: DIM });
    textRight(money(quote.subtotal), { right: PAGE_W - MARGIN, y: y - 11, size: 9.5, color: DIM });
    y -= 19; rule(y + 4);

    text("Discount (" + quote.discount + "%)", { x: MARGIN, y: y - 11, size: 9.5, color: DIM });
    textRight("- " + money(quote.discountAmount), { right: PAGE_W - MARGIN, y: y - 11, size: 9.5, color: DIM });
    y -= 19; rule(y + 4);
  }

  y -= 8;
  text("Total", { x: MARGIN, y: y - 15, size: 18, font: serif });
  textRight(money(quote.total), { right: PAGE_W - MARGIN, y: y - 15, size: 18, font: serif });
  y -= 34;

  /* ---- Inspiration images, on their own page ---- */
  if (images.length > 0) {
    newPage();

    text("Inspiration", { x: MARGIN, y: y - 20, size: 20, font: serif });
    y -= 34;

    const note = "The images below are shared as inspiration for the proposed style. " +
                 "They are a visual reference, not the final result.";
    wrap(note, sans, 9, CONTENT).forEach((line) => {
      text(line, { x: MARGIN, y: y - 10, size: 9, color: DIM });
      y -= 13;
    });
    y -= 12;

    const COLS = 3;
    const GAP  = 8;
    const cellW = (CONTENT - GAP * (COLS - 1)) / COLS;
    const cellH = cellW * 4 / 3;

    for (let i = 0; i < images.length; i++) {
      const col = i % COLS;
      if (col === 0) room(cellH + GAP);

      let picture;
      try {
        const raw = Buffer.from(String(images[i]).split(",").pop(), "base64");
        picture = String(images[i]).includes("image/png")
          ? await doc.embedPng(raw)
          : await doc.embedJpg(raw);
      } catch (err) {
        continue;   // a picture that cannot be read is simply skipped
      }

      // Cover the cell without distorting the photo
      const scale = Math.max(cellW / picture.width, cellH / picture.height);
      const drawW = picture.width * scale;
      const drawH = picture.height * scale;
      const x     = MARGIN + col * (cellW + GAP);

      page.drawImage(picture, {
        x: x - (drawW - cellW) / 2,
        y: y - cellH - (drawH - cellH) / 2,
        width: drawW,
        height: drawH
      });

      // Mask the overflow so neighbouring cells stay clean
      if (drawW > cellW) {
        const over = (drawW - cellW) / 2;
        page.drawRectangle({ x: x - over, y: y - cellH, width: over, height: cellH, color: BLACK });
        page.drawRectangle({ x: x + cellW, y: y - cellH, width: over, height: cellH, color: BLACK });
      }

      if (col === COLS - 1 || i === images.length - 1) y -= cellH + GAP;
    }
    y -= 10;
  }

  /* ---- Signature ---- */
  room(60);
  y -= 12;
  rule(y);
  y -= 22;

  textRight("Karen Aguja de Pérez", { right: PAGE_W - MARGIN, y: y - 4, size: 17, font: serif });
  y -= 16;
  textRight(tracked("KA Event & Design", true), { right: PAGE_W - MARGIN, y: y - 4, size: 7, color: DIM, font: sansM });

  return Buffer.from(await doc.save());
}
