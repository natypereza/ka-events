/* Protects the quote and history pages.

   The real protection is on the server: without a valid session
   cookie the API returns nothing, so no client data can be read.
   This check only avoids showing an empty page to someone who has
   not entered the code. */

(function () {
  // Hide the page until the session is confirmed, so nothing flashes
  const style = document.createElement("style");
  style.id = "ka-guard";
  style.textContent = "body{visibility:hidden}";
  document.head.appendChild(style);

  function reveal() {
    const node = document.getElementById("ka-guard");
    if (node) node.remove();
  }

  fetch("/api/session", { credentials: "same-origin" })
    .then((res) => res.json())
    .then((body) => {
      if (body.signedIn) {
        reveal();
      } else {
        window.location.replace("index.html");
      }
    })
    .catch(() => {
      // If the check itself fails, show the page: the API still
      // refuses to hand over any data without a session.
      reveal();
    });
})();
