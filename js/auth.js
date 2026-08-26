/* Access code — KA Event & Design
   NOTE: this check runs in the browser. It keeps the page reserved, but it
   is not real security (the code is visible in the source). A server would
   be needed for that. */

const CODE = "Kaguja7";

const modal = document.getElementById("modal");
const input = document.getElementById("codeInput");
const error = document.getElementById("codeError");
const form  = document.getElementById("codeForm");

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

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (input.value.trim() === CODE) {
    try {
      sessionStorage.setItem("ka_access", "ok");
    } catch (err) {
      /* Some browsers block sessionStorage when the file is opened
         directly (file://). The URL parameter is the fallback. */
    }
    // The URL fallback is only used when opening the files from disk
    window.location.href = window.location.protocol === "file:"
      ? "quotations.html?access=ok"
      : "quotations.html";
  } else {
    error.textContent = "Incorrect code. Please try again.";
    input.value = "";
    input.focus();
  }
});
