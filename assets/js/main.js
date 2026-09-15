(function () {
  "use strict";

  var cfg = window.SITE || {};
  var photos = window.PHOTOS || [];

  // ----- мелочи -----

  function $(sel, root) { return (root || document).querySelector(sel); }

  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function setText(sel, value) {
    var el = $(sel);
    if (el) el.textContent = value || "";
  }

  // ----- шапка -----

  setText("[data-hero-kicker]", (cfg.hero && cfg.hero.kicker) || "");
  setText("[data-hero-name]", cfg.name || "");
  setText("[data-hero-sub]", (cfg.hero && cfg.hero.subtitle) || "");
  setText("[data-footer]", cfg.footer || "");
  if (cfg.name) document.title = "С днём рождения, " + cfg.name;

  // ----- счётчики -----

  function daysUntilBirthday(mmdd) {
    var parts = String(mmdd).split("-");
    if (parts.length !== 2) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var next = new Date(today.getFullYear(), Number(parts[0]) - 1, Number(parts[1]));
    if (next < today) next.setFullYear(next.getFullYear() + 1);
    return Math.round((next - today) / 86400000);
  }

  if (cfg.birthday) {
    var left = daysUntilBirthday(cfg.birthday);
    if (left !== null) {
      var box = $("[data-countdown]");
      if (left === 0) {
        setText("[data-countdown-value]", "Сегодня");
        setText("[data-countdown-caption]", "тот самый день");
      } else {
        setText("[data-countdown-value]", left + " " + plural(left, "день", "дня", "дней"));
        setText("[data-countdown-caption]", "до дня рождения");
      }
      if (box) box.hidden = false;
    }
  }

  if (cfg.togetherSince) {
    var start = new Date(cfg.togetherSince + "T00:00:00");
    if (!isNaN(start)) {
      var days = Math.floor((Date.now() - start.getTime()) / 86400000);
      if (days > 0) {
        setText("[data-together-value]", days.toLocaleString("ru-RU"));
        setText("[data-together-caption]", plural(days, "день", "дня", "дней") + " вместе");
        var t = $("[data-together]");
        if (t) t.hidden = false;
      }
    }
  }

  // ----- письмо -----

  var letterBox = $("[data-letter]");
  if (letterBox && Array.isArray(cfg.letter)) {
    cfg.letter.forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      letterBox.appendChild(p);
    });
  }

  // ----- таймлайн -----

  var tl = $("[data-timeline]");
  if (tl && Array.isArray(cfg.timeline) && cfg.timeline.length) {
    cfg.timeline.forEach(function (item) {
      var li = document.createElement("li");
      if (item.year) {
        var y = document.createElement("div");
        y.className = "tl__year";
        y.textContent = item.year;
        li.appendChild(y);
      }
      var h = document.createElement("h3");
      h.className = "tl__title";
      h.textContent = item.title || "";
      li.appendChild(h);
      if (item.text) {
        var p = document.createElement("p");
        p.className = "tl__text";
        p.textContent = item.text;
        li.appendChild(p);
      }
      tl.appendChild(li);
    });
    $("#timeline").hidden = false;
  }

  // ----- галерея -----

  setText("[data-gallery-title]", (cfg.gallery && cfg.gallery.title) || "Фотографии");

  var grid = $("[data-grid]");
  var empty = $("[data-gallery-empty]");

  if (!photos.length) {
    if (empty) {
      empty.textContent = (cfg.gallery && cfg.gallery.emptyText) || "Фотографии скоро появятся здесь.";
      empty.hidden = false;
    }
  } else if (grid) {
    photos.forEach(function (photo, i) {
      var btn = document.createElement("button");
      btn.className = "tile";
      btn.type = "button";
      btn.setAttribute("aria-label", "Открыть фото " + (i + 1));

      var img = document.createElement("img");
      img.src = photo.thumb || photo.src;
      img.alt = photo.caption || "";
      img.loading = i < 6 ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("load", function () { img.classList.add("is-loaded"); });
      if (img.complete) img.classList.add("is-loaded");

      btn.appendChild(img);
      btn.addEventListener("click", function () { openLightbox(i); });
      grid.appendChild(btn);
    });
  }

  // ----- лайтбокс -----

  var lb = $("[data-lightbox]");
  var lbImg = $("[data-lb-img]");
  var lbCap = $("[data-lb-cap]");
  var current = 0;

  function show(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    var photo = photos[current];
    lbImg.src = photo.src;
    lbImg.alt = photo.caption || "";
    lbCap.textContent = photo.caption || "";
  }

  function openLightbox(i) {
    if (!lb) return;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
  }

  if (lb) {
    $("[data-lb-close]").addEventListener("click", closeLightbox);
    $("[data-lb-prev]").addEventListener("click", function () { show(current - 1); });
    $("[data-lb-next]").addEventListener("click", function () { show(current + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });

    // свайпы на телефоне
    var startX = null;
    lb.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  // ----- появление блоков -----

  var blocks = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    blocks.forEach(function (b) { b.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "-10% 0px" });
    blocks.forEach(function (b) { io.observe(b); });
  }
})();
