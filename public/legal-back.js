(function () {
  var lang = "ru";
  try {
    var raw = localStorage.getItem("konshu-state-v1");
    var parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.lang === "ky") lang = "ky";
  } catch { /* lang stays ru */ }
  var links = document.querySelectorAll("[data-legal-back]");
  for (var i = 0; i < links.length; i++) {
    links[i].textContent = lang === "ky" ? "‹ Артка" : "‹ Назад";
    links[i].addEventListener("click", function (event) {
      if (window.history.length > 1) {
        event.preventDefault();
        window.history.back();
      }
    });
  }
})();
