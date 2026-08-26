/* Access code — KA Event & Design

   The code is checked on the server. It is not in this file, so it
   cannot be read from the page source. */

const modal = document.getElementById("modal");
const input = document.getElementById("codeInput");
const error = document.getElementById("codeError");
const form  = document.getElementById("codeForm");
const submit = form.querySelector("button[type=submit]");

function openModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  error.textContent = "";
  input.value = "";
  input.focus();
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.getElementById("btnEnter").addEventListener("click", openModal);
document.getElementById("btnClose").addEventListener("click", closeModal);

// Close when clicking outside the box
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Close with Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  error.textContent = "";

  const code = input.value.trim();
  if (!code) return;

  submit.disabled = true;
  submit.textContent = "Checking…";

  try {
    const res  = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ code })
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok) {
      window.location.href = "quotations.html";
      return;
    }

    error.textContent = body.error || "Incorrect code. Please try again.";
    input.value = "";
    input.focus();
  } catch (err) {
    error.textContent = "Could not reach the server. Check your connection.";
  } finally {
    submit.disabled = false;
    submit.textContent = "Continue";
  }
});
