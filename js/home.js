/* Quote request — KA Event & Design

   The form does not send anything by itself: it opens WhatsApp with
   the message already written, so the client only has to press send.
   That way there is no server and nothing to configure. */

const WHATSAPP = "https://api.whatsapp.com/send?phone=50255171700";

const reqModal = document.getElementById("requestModal");
const reqForm  = document.getElementById("requestForm");
const reqError = document.getElementById("requestError");

function openRequest() {
  reqModal.classList.add("open");
  reqModal.setAttribute("aria-hidden", "false");
  reqError.textContent = "";
  document.getElementById("rName").focus();
}

function closeRequest() {
  reqModal.classList.remove("open");
  reqModal.setAttribute("aria-hidden", "true");
}

document.getElementById("btnRequest").addEventListener("click", openRequest);
document.getElementById("btnRequestClose").addEventListener("click", closeRequest);

// Close when clicking outside the box
reqModal.addEventListener("click", (e) => {
  if (e.target === reqModal) closeRequest();
});

// Close with Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && reqModal.classList.contains("open")) closeRequest();
});

// "September 12, 2026" from a 24h date field
function requestDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
}

reqForm.addEventListener("submit", (e) => {
  e.preventDefault();
  reqError.textContent = "";

  const name  = document.getElementById("rName").value.trim();
  const phone = document.getElementById("rPhone").value.trim();
  const type  = document.getElementById("rType").value.trim();
  const date  = document.getElementById("rDate").value;

  if (!name) {
    reqError.textContent = "Please enter your name.";
    return;
  }
  if (!phone) {
    reqError.textContent = "Please enter your phone number.";
    return;
  }
  if (!type) {
    reqError.textContent = "Please say what kind of event it is.";
    return;
  }

  const lines = [
    "Hello KA Event & Design, I would like a quote.",
    "",
    "Name: " + name,
    "Phone: " + phone,
    "Type of event: " + type
  ];

  if (date) lines.push("Event date: " + requestDate(date));

  const url = WHATSAPP + "&text=" + encodeURIComponent(lines.join("\n"));

  // A blocked pop-up would leave the visitor with nothing, so fall
  // back to opening WhatsApp in this same tab.
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) window.location.href = url;

  closeRequest();
  reqForm.reset();
});
