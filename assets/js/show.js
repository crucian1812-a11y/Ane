(function () {
  "use strict";

  var cfg = window.SITE || {};
  var photos = window.PHOTOS || [];
  var tracks = cfg.tracks || [];
  var moments = cfg.moments || [];

  var $ = function (sel) { return document.querySelector(sel); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = function () { return Math.min(innerWidth, innerHeight) < 620; };

  var el = {
    intro: $("[data-intro]"),
    stage: $("[data-stage]"),
    cards: $("[data-cards]"),
    bgA: $("[data-bg-a]"),
    bgB: $("[data-bg-b]"),
    moment: $("[data-moment]"),
    momentLabel: $("[data-moment-label]"),
    momentText: $("[data-moment-text]"),
    finale: $("[data-finale]"),
    bar: $("[data-bar]"),
    audio: $("[data-audio]"),
    progress: $("[data-progress]"),
    toggleIcon: $("[data-toggle-icon]"),
  };

  function text(sel, value) {
    var node = $(sel);
    if (node) node.textContent = value || "";
  }

  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  // ---------- обложка ----------

  var intro = cfg.intro || {};
  text("[data-intro-kicker]", intro.kicker);
  text("[data-intro-name]", cfg.name);
  text("[data-intro-sub]", intro.subtitle);
  text("[data-intro-hint]", intro.hint);
  text("[data-start]", intro.button || "Включить");
  if (cfg.name) document.title = "С днём рождения, " + cfg.name;

  var finale = cfg.finale || {};
  text("[data-finale-title]", finale.title);
  text("[data-finale-text]", finale.text);
  text("[data-again]", finale.again || "Ещё раз");
  text("[data-finale-gallery]", finale.gallery || "Все фотографии");

  (function countdown() {
    if (!cfg.birthday) return;
    var parts = String(cfg.birthday).split("-");
    if (parts.length !== 2) return;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var next = new Date(today.getFullYear(), Number(parts[0]) - 1, Number(parts[1]));
    if (next < today) next.setFullYear(next.getFullYear() + 1);
    var left = Math.round((next - today) / 86400000);

    var line;
    if (left === 0) line = "сегодня";
    else line = "через " + left + " " + plural(left, "день", "дня", "дней");

    if (cfg.togetherSince) {
      var start = new Date(cfg.togetherSince + "T00:00:00");
      if (!isNaN(start)) {
        var days = Math.floor((Date.now() - start.getTime()) / 86400000);
        if (days > 0) line += " · " + days.toLocaleString("ru-RU") + " " + plural(days, "день", "дня", "дней") + " вместе";
      }
    }

    var node = $("[data-countdown]");
    if (node) { node.textContent = line; node.hidden = false; }
  })();

  // ---------- позиции карточек ----------

  // Позиции в процентах от экрана, ширина — в vmin.
  // Порядок неслучайный: соседние по списку зоны всегда в разных углах,
  // поэтому три карточки на экране никогда не сбиваются в кучу.
  // Зоны разложены по кругу с шагом в золотой угол: соседние по списку
  // всегда попадают в разные части экрана, так что три карточки
  // никогда не сбиваются в кучу и пустых половин не остаётся.
  var slots = [
    { x: 75.0, y: 50.0, w: 44, r: "-2deg" },
    { x: 31.6, y: 63.5, w: 34, r: "2.5deg" },
    { x: 52.2, y: 30.1, w: 40, r: "-3deg" },
    { x: 65.2, y: 65.9, w: 36, r: "1.5deg" },
    { x: 25.4, y: 46.5, w: 42, r: "3deg" },
    { x: 71.1, y: 39.3, w: 35, r: "-1.5deg" },
    { x: 43.5, y: 69.3, w: 38, r: "2deg" },
    { x: 38.5, y: 32.3, w: 36, r: "-2.5deg" },
  ];

  var slotIndex = 0;

  function nextSlot() {
    if (small()) {
      // на телефоне место есть только под одну карточку — зато крупную
      mobileFlip = !mobileFlip;
      return { x: 50, y: 47, w: 84, r: mobileFlip ? "-1.5deg" : "1.5deg" };
    }
    return slots[slotIndex++ % slots.length];
  }

  var mobileFlip = false;

  // ---------- фотографии ----------

  var photoIndex = 0;

  function photoAt(i) {
    var p = photos[i % photos.length];
    return p ? (p.src || p) : null;
  }

  function preload(from, count) {
    for (var i = 0; i < count; i++) {
      var src = photoAt(from + i);
      if (src) { var img = new Image(); img.src = src; }
    }
  }

  var bgFlip = false;

  function setBackground(src) {
    var incoming = bgFlip ? el.bgA : el.bgB;
    var outgoing = bgFlip ? el.bgB : el.bgA;
    bgFlip = !bgFlip;
    incoming.style.backgroundImage = 'url("' + src.replace(/"/g, '\\"') + '")';
    incoming.classList.remove("is-on");
    void incoming.offsetWidth; // перезапуск анимации
    incoming.classList.add("is-on");
    outgoing.classList.remove("is-on");
  }

  var live = [];

  function spawn() {
    if (!photos.length) return;
    var src = photoAt(photoIndex);
    photoIndex = (photoIndex + 1) % photos.length;
    preload(photoIndex, 3);

    var slot = nextSlot();
    var card = document.createElement("figure");
    card.className = "card";
    card._pos = slot;
    card.style.setProperty("--x", slot.x + "%");
    card.style.setProperty("--y", slot.y + "%");
    card.style.setProperty("--w", slot.w + "vmin");
    card.style.setProperty("--r", slot.r);

    var img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.decoding = "async";
    card.appendChild(img);
    el.cards.appendChild(card);
    live.push(card);

    setBackground(src);

    var maxLive = small() ? 1 : 3;
    while (live.length > maxLive) retire(live.shift());

    card._timer = setTimeout(function () {
      var at = live.indexOf(card);
      if (at !== -1) live.splice(at, 1);
      retire(card);
    }, reduced ? 5200 : 9400);

    sinceMoment++;
    if (sinceMoment >= momentEvery) { sinceMoment = 0; showMoment(); }
  }

  function retire(card) {
    if (!card || card._out) return;
    card._out = true;
    clearTimeout(card._timer);
    card.classList.add("is-out");
    setTimeout(function () { card.remove(); }, 1800);
  }

  // ---------- реплики ----------

  var momentIndex = 0;
  var sinceMoment = 3;
  var momentEvery = 5;
  var momentTimer = null;

  function showMoment() {
    if (!moments.length) return;
    var item = moments[momentIndex % moments.length];
    momentIndex++;

    clearTimeout(momentTimer);
    el.moment.classList.remove("is-out");
    el.momentLabel.textContent = item.label || "";
    el.momentLabel.hidden = !item.label;
    el.momentText.textContent = item.text || "";
    el.moment.hidden = false;
    void el.moment.offsetWidth;
    el.stage.classList.add("is-telling");

    momentTimer = setTimeout(function () {
      el.moment.classList.add("is-out");
      el.stage.classList.remove("is-telling");
      momentTimer = setTimeout(function () { el.moment.hidden = true; }, 1200);
    }, 6500);
  }

  // ---------- музыка ----------

  var trackIndex = 0;
  var audio = el.audio;
  var actx = null, analyser = null, freq = null, avg = 0;

  function loadTrack(i) {
    var track = tracks[i];
    if (!track) return;
    audio.src = track.src;
    text("[data-track-title]", track.title);
    text("[data-track-artist]", track.artist);
  }

  function initAnalyser() {
    if (actx || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      var source = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      analyser = null; // не получилось — будем показывать по таймеру
    }
  }

  var lastSpawn = 0;
  var MIN_GAP = 1400;
  var MAX_GAP = 3600;
  var rafId = null;

  function pulse() {
    rafId = requestAnimationFrame(pulse);
    var now = performance.now();
    if (audio.paused) { lastSpawn = Math.max(lastSpawn, now - MAX_GAP + 600); return; }

    if (analyser) {
      analyser.getByteFrequencyData(freq);
      var energy = 0;
      for (var i = 1; i < 14; i++) energy += freq[i];
      energy /= 13;
      avg = avg * 0.94 + energy * 0.06;

      var loud = energy > avg * 1.25 && energy > 26;
      if (loud && now - lastSpawn > MIN_GAP) { lastSpawn = now; spawn(); return; }
    }

    if (now - lastSpawn > MAX_GAP) { lastSpawn = now; spawn(); }
  }

  audio.addEventListener("ended", function () {
    trackIndex++;
    if (trackIndex >= tracks.length) { finish(); return; }
    loadTrack(trackIndex);
    audio.play().catch(function () {});
  });

  audio.addEventListener("timeupdate", function () {
    if (!audio.duration) return;
    var whole = tracks.length || 1;
    var done = (trackIndex + audio.currentTime / audio.duration) / whole;
    el.progress.style.width = (done * 100).toFixed(2) + "%";
  });

  // ---------- запуск, пауза, финал ----------

  function start() {
    el.intro.classList.add("is-gone");
    setTimeout(function () { el.intro.hidden = true; }, 900);

    el.stage.hidden = false;
    el.bar.hidden = false;
    el.finale.hidden = true;
    el.finale.classList.remove("is-gone");

    initAnalyser();
    if (actx && actx.state === "suspended") actx.resume();

    loadTrack(trackIndex);
    audio.play().catch(function () {});

    lastSpawn = performance.now() - MAX_GAP;
    if (!rafId) pulse();
    if (photos.length) { preload(0, 5); spawn(); }
    else showMoment();

    poke();
  }

  function finish() {
    cancelAnimationFrame(rafId);
    rafId = null;
    live.slice().forEach(retire);
    live = [];
    el.moment.hidden = true;
    el.stage.classList.remove("is-telling");
    el.finale.hidden = false;
    el.bar.classList.add("is-hidden");
  }

  function again() {
    el.finale.classList.add("is-gone");
    setTimeout(function () {
      el.finale.hidden = true;
      el.finale.classList.remove("is-gone");
    }, 900);
    trackIndex = 0;
    photoIndex = 0;
    momentIndex = 0;
    sinceMoment = 3;
    el.bar.classList.remove("is-hidden");
    loadTrack(0);
    audio.play().catch(function () {});
    lastSpawn = performance.now() - MAX_GAP;
    if (!rafId) pulse();
    poke();
  }

  function toggle() {
    if (audio.paused) {
      if (actx && actx.state === "suspended") actx.resume();
      audio.play().catch(function () {});
      el.toggleIcon.textContent = "❚❚";
    } else {
      audio.pause();
      el.toggleIcon.textContent = "▶";
    }
  }

  function nextTrack() {
    trackIndex++;
    if (trackIndex >= tracks.length) { finish(); return; }
    loadTrack(trackIndex);
    audio.play().catch(function () {});
  }

  function fullscreen() {
    var root = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen().catch(function () {});
  }

  $("[data-start]").addEventListener("click", start);
  $("[data-again]").addEventListener("click", again);
  $("[data-toggle]").addEventListener("click", toggle);
  $("[data-next]").addEventListener("click", nextTrack);
  $("[data-fullscreen]").addEventListener("click", fullscreen);

  document.addEventListener("keydown", function (e) {
    if (el.stage.hidden) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); poke(); }
    if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") fullscreen();
    if (e.key === "ArrowRight") { nextTrack(); poke(); }
  });

  // панель прячется, когда её не трогают
  var barTimer = null;

  function poke() {
    el.bar.classList.remove("is-hidden");
    clearTimeout(barTimer);
    barTimer = setTimeout(function () {
      if (!el.stage.hidden && el.finale.hidden) el.bar.classList.add("is-hidden");
    }, 3800);
  }

  ["mousemove", "touchstart", "click"].forEach(function (evt) {
    document.addEventListener(evt, function () { if (!el.stage.hidden) poke(); }, { passive: true });
  });
})();
