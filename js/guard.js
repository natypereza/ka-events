/* Protects the quotations page: sends you back home if the code was not
   entered. Loaded in the <head> to avoid a flash of content. */

(function () {
  var inSession = false;
  try {
    inSession = sessionStorage.getItem("ka_access") === "ok";
  } catch (err) {
    /* sessionStorage blocked (for example when opened via file://) */
  }

  /* The URL fallback exists only for opening the files directly from
     the Desktop, where some browsers block sessionStorage. On a real
     web address it is refused, so nobody can skip the code by typing
     quotations.html?access=ok */
  var inURL = window.location.protocol === "file:" &&
              window.location.search.indexOf("access=ok") !== -1;

  if (!inSession && !inURL) {
    window.location.replace("index.html");
  }
})();
