(function () {
  "use strict";

  var cfg = window.SITE || {};
  var photos = window.PHOTOS || [];
  var gallery = cfg.gallery || {};

  function $(sel) { return document.querySelector(sel); }

  // Прямо в галерею с улицы не пускаем — сначала вопрос на обложке.
  var locked = cfg.gate && cfg.gate.answer;
  if (locked) {
    var unlocked = false;
    try { unlocked = localStorage.getItem("ane-unlocked") === "1"; } catch (err) { unlocked = false; }
    if (!unlocked) { location.replace("index.html"); return; }
  }

  $("[data-gallery-title]").textContent = gallery.title || "Все фотографии";
  $("[data-gallery-back]").textContent = gallery.back || "Назад";
  document.title = gallery.title || "Все фотографии";

  var grid = $("[data-grid]");
  var empty = $("[data-gallery-empty]");

  if (!photos.length) {
    empty.textContent = gallery.emptyText || "Фотографии скоро появятся здесь.";
    empty.hidden = false;
  } else {
    photos.forEach(function (photo, i) {
      var btn = document.createElement("button");
      btn.className = "tile";
      btn.type = "button";
      btn.setAttribute("aria-label", "Открыть фото " + (i + 1));

      var img = document.createElement("img");
      img.src = photo.thumb || photo.src;
      img.alt = photo.caption || "";
      img.loading = i < 12 ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("load", function () { img.classList.add("is-loaded"); });
      if (img.complete) img.classList.add("is-loaded");

      btn.appendChild(img);
      btn.addEventListener("click", function () { open(i); });
      grid.appendChild(btn);
    });
  }

  var lb = $("[data-lightbox]");
  var lbImg = $("[data-lb-img]");
  var lbCap = $("[data-lb-cap]");
  var current = 0;

  function show(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    var photo = photos[current];
    lbImg.src = photo.full || photo.src;
    lbImg.alt = photo.caption || "";
    lbCap.textContent = photo.caption || (current + 1) + " / " + photos.length;
    // тихо подгружаем соседей
    [current + 1, current - 1].forEach(function (n) {
      var p = photos[(n + photos.length) % photos.length];
      if (p) { var img = new Image(); img.src = p.full || p.src; }
    });
  }

  function open(i) {
    show(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
  }

  $("[data-lb-close]").addEventListener("click", close);
  $("[data-lb-prev]").addEventListener("click", function () { show(current - 1); });
  $("[data-lb-next]").addEventListener("click", function () { show(current + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  var startX = null;
  lb.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  }, { passive: true });
})();
