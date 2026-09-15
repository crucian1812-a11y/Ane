(function () {
  "use strict";

  var cfg = window.SITE || {};
  var photos = window.PHOTOS || [];
  var tracks = cfg.tracks || [];
  var moments = cfg.moments || [];

  var $ = function (sel) { return document.querySelector(sel); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = function () { return Math.min(innerWidth, innerHeight) < 620; };
  var wide = function () { return innerWidth > innerHeight; };

  var pace = cfg.pace || {};
  var MIN_GAP = pace.minGap || 3000;
  var MAX_GAP = pace.maxGap || 6000;
  var CARD_LIFE = pace.life || 12000;
  var MOMENT_HOLD = pace.momentHold || 7000;
  var FINALE_HOLD = pace.finaleHold || 5000;
  var FADE = pace.fade || 2000;

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

  // ---------- вход по вопросу ----------
  // Защита тут условная: сайт публичный, и по прямой ссылке фотографии
  // всё равно откроются. Вопрос отсекает случайных прохожих, не более.

  var UNLOCK_KEY = "ane-unlocked";

  function remembered() {
    try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch (err) { return false; }
  }

  function remember() {
    try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (err) { /* приватное окно — переживём */ }
  }

  // сравниваем только буквы и цифры: «25.07.2014» и «25 07 2014» — одно и то же
  function normalize(value) {
    return String(value).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/gi, "");
  }

  var gate = cfg.gate;
  var startButton = $("[data-start]");
  var gateForm = $("[data-gate]");

  // Подзаголовок и подсказка объясняют кнопку, поэтому до ответа
  // на вопрос их показывать незачем.
  function openStart() {
    if (gateForm) gateForm.hidden = true;
    startButton.hidden = false;
    $("[data-intro-sub]").hidden = false;
    $("[data-intro-hint]").hidden = false;
  }

  if (!gate || !gate.answer || remembered()) {
    openStart();
  } else {
    var question = $("[data-gate-question]");
    var input = $("[data-gate-input]");
    var error = $("[data-gate-error]");
    question.textContent = gate.question;
    if (gate.hint) input.placeholder = gate.hint;
    text("[data-gate-button]", gate.button || "Дальше");
    gateForm.hidden = false;

    gateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (normalize(input.value) === normalize(gate.answer)) {
        remember();
        openStart();
        startButton.focus();
      } else {
        error.textContent = gate.error || "Не сходится. Попробуй ещё раз.";
        error.hidden = false;
        input.select();
      }
    });
  }

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
    { x: 75.0, y: 50.0, w: 42, r: "-2deg" },
    { x: 31.6, y: 63.5, w: 34, r: "2.5deg" },
    { x: 52.2, y: 30.1, w: 38, r: "-3deg" },
    { x: 65.2, y: 65.9, w: 36, r: "1.5deg" },
    { x: 25.4, y: 46.5, w: 40, r: "3deg" },
    { x: 71.1, y: 39.3, w: 35, r: "-1.5deg" },
    { x: 43.5, y: 69.3, w: 38, r: "2deg" },
    { x: 38.5, y: 32.3, w: 36, r: "-2.5deg" },
  ];

  var slotIndex = 0;

  function nextSlot() {
    if (small()) {
      // на телефоне место есть только под одну карточку — зато крупную.
      // Чуть выше центра: снизу нужен воздух под реплику и панель.
      mobileFlip = !mobileFlip;
      var tilt = mobileFlip ? "-1.5deg" : "1.5deg";
      return wide()
        ? { x: 50, y: 40, w: 42, r: tilt }
        : { x: 50, y: 43, w: 82, r: tilt };
    }
    return slots[slotIndex++ % slots.length];
  }

  var mobileFlip = false;

  // ---------- фотографии ----------

  var photoIndex = 0;
  var shown = 0;      // сколько кадров уже показали — по нему идёт музыка
  var finaleTimer = null;
  var ending = false; // лента дошла до конца, новые кадры больше не нужны

  function photoAt(i) {
    return photos[i % photos.length] || null;
  }

  function srcOf(photo) {
    return photo ? (photo.src || photo) : null;
  }

  function preload(from, count) {
    for (var i = 0; i < count; i++) {
      var src = srcOf(photoAt(from + i));
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
    var current = photoIndex;
    var photo = photoAt(current);
    var src = srcOf(photo);

    photoIndex = (photoIndex + 1) % photos.length;
    var wrapped = photoIndex === 0;
    var frame = current + 1;
    shown++;
    preload(photoIndex, 3);

    // песня меняется по кадру, а не по своему окончанию,
    // иначе музыка разъезжается с лентой
    playTrack(trackForFrame(frame), true);

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

    var life = reduced ? Math.round(CARD_LIFE * 0.6) : CARD_LIFE;
    if (frame >= photos.length) life += FINALE_HOLD;
    card._timer = setTimeout(function () {
      var at = live.indexOf(card);
      if (at !== -1) live.splice(at, 1);
      retire(card);
    }, life);

    if (momentDue(current)) showMoment();
    // лента пошла по второму кругу — пусть и реплики начнутся сначала,
    // но только после того, как последняя из них успела показаться
    if (wrapped) momentIndex = 0;

    // показ кончается вместе с лентой, а не с последней песней:
    // последний кадр висит ещё немного, потом музыка уходит в тишину
    if (frame >= photos.length && !ending) {
      ending = true;
      finaleTimer = setTimeout(function () {
        fadeTo(0, FADE, finish);
      }, FINALE_HOLD);
    }
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
  var momentGapMin = pace.momentGapMin || 3;
  var momentTimer = null;

  // Реплики заранее расставляются по ленте. Фотографии отсортированы
  // по дате съёмки, поэтому «Родился Глеб» встаёт ровно на первый кадр
  // того времени — это жёсткий якорь, он не двигается. Остальные реплики
  // распределяются между якорями. Если дат у фотографий нет (телеграм
  // вычищает EXIF), позиция берётся из доли ленты — поля at.
  var plan = [];

  function planMoments() {
    var n = photos.length;
    if (!n || !moments.length) return [];

    // якоря: либо прямой номер кадра, либо первый кадр,
    // снятый не раньше указанной даты
    var slots = moments.map(function (item) {
      var pos = null;
      if (typeof item.frame === "number" && item.frame >= 1 && item.frame <= n) {
        pos = item.frame - 1;
      }
      if (pos === null && item.after) {
        for (var i = 0; i < n; i++) {
          if (photos[i].date && photos[i].date >= item.after) { pos = i; break; }
        }
      }
      return { pos: pos, hard: pos !== null, at: typeof item.at === "number" ? item.at : null };
    });

    var anchored = slots.some(function (slot) { return slot.hard; });

    if (!anchored) {
      // дат нет — раскладываем по долям ленты
      slots.forEach(function (slot, i) {
        slot.pos = slot.at !== null
          ? Math.round(slot.at * (n - 1))
          : Math.round((i + 1) * n / (slots.length + 1));
      });
    } else {
      // якоря стоят намертво, остальные реплики делят промежутки между ними
      var i = 0;
      while (i < slots.length) {
        if (slots[i].hard) { i++; continue; }
        var j = i;
        while (j < slots.length && !slots[j].hard) j++;
        var left = i > 0 ? slots[i - 1].pos : -1;
        var right = j < slots.length ? slots[j].pos : n;
        var parts = j - i + 1;
        for (var k = i; k < j; k++) {
          slots[k].pos = Math.round(left + (right - left) * (k - i + 1) / parts);
        }
        i = j;
      }
    }

    // мягкие разводим по зазору
    for (var a = 1; a < slots.length; a++) {
      var floor = slots[a - 1].pos + momentGapMin;
      if (slots[a].pos < floor && !slots[a].hard) slots[a].pos = floor;
    }

    // Якорь не двигается вперёд ни при каких обстоятельствах: иначе кадры
    // с сыном пойдут раньше, чем про него скажут. Если мягкая реплика
    // на него наехала — отступает она, и по цепочке влево.
    for (var b = 0; b < slots.length; b++) {
      if (!slots[b].hard) continue;
      for (var c = b - 1; c >= 0; c--) {
        if (slots[c].pos < slots[c + 1].pos) break;
        if (slots[c].hard) break;
        slots[c].pos = Math.max(0, slots[c + 1].pos - 1);
      }
    }

    // и хвост не должен вылезать за конец ленты, иначе последние реплики
    // не покажутся вовсе
    var ceil = n - 1;
    for (var d = slots.length - 1; d >= 0; d--) {
      if (!slots[d].hard && slots[d].pos > ceil) slots[d].pos = ceil;
      ceil = slots[d].pos - 1;
    }

    return slots;
  }

  function momentDue(shownIndex) {
    var slot = plan[momentIndex];
    return !!slot && shownIndex >= slot.pos;
  }

  function showMoment() {
    var item = moments[momentIndex];
    if (!item) return;
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
    }, MOMENT_HOLD);
  }

  // ---------- музыка ----------

  var trackIndex = -1;
  var audio = el.audio;
  var actx = null, analyser = null, freq = null, avg = 0, gain = null;

  function setVolume(v) {
    if (gain) gain.gain.value = v;
    else audio.volume = v;
  }

  function getVolume() {
    return gain ? gain.gain.value : audio.volume;
  }

  var fadeTimer = null;

  function fadeTo(target, ms, done) {
    clearInterval(fadeTimer);
    var from = getVolume();
    var steps = Math.max(1, Math.round(ms / 50));
    var step = 0;
    fadeTimer = setInterval(function () {
      step++;
      setVolume(Math.max(0, Math.min(1, from + (target - from) * step / steps)));
      if (step >= steps) {
        clearInterval(fadeTimer);
        if (done) done();
      }
    }, 50);
  }

  function loadTrack(i) {
    var track = tracks[i];
    if (!track) return;
    trackIndex = i;
    audio.src = track.src;
    text("[data-track-title]", track.title);
    text("[data-track-artist]", track.artist);

    // перемотка возможна только после того, как браузер прочитал файл
    if (track.start) {
      var seek = function () {
        try { audio.currentTime = track.start; } catch (err) { /* переживём */ }
        audio.removeEventListener("loadedmetadata", seek);
      };
      audio.addEventListener("loadedmetadata", seek);
    }
  }

  function playTrack(i, smooth) {
    if (i === trackIndex || !tracks[i]) return;
    if (!smooth) {
      loadTrack(i);
      setVolume(1);
      audio.play().catch(function () {});
      return;
    }
    fadeTo(0, FADE / 2, function () {
      loadTrack(i);
      audio.play().catch(function () {});
      fadeTo(1, FADE / 2);
    });
  }

  // какой трек положен этому кадру
  function trackForFrame(frame) {
    var found = 0;
    for (var i = 0; i < tracks.length; i++) {
      if (frame >= (tracks[i].fromFrame || 1)) found = i;
    }
    return found;
  }

  function initAnalyser() {
    if (actx || (!window.AudioContext && !window.webkitAudioContext)) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      var source = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      gain = actx.createGain();
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      analyser = null; // не получилось — будем показывать по таймеру
      gain = null;
    }
  }

  var lastSpawn = 0;
  var rafId = null;

  function pulse() {
    rafId = requestAnimationFrame(pulse);
    var now = performance.now();
    // последний кадр досматриваем молча, новые не выбрасываем
    if (ending) return;
    if (audio.paused) { lastSpawn = Math.max(lastSpawn, now - MAX_GAP + 600); return; }

    if (analyser) {
      analyser.getByteFrequencyData(freq);
      var energy = 0;
      for (var i = 1; i < 14; i++) energy += freq[i];
      energy /= 13;
      // Окно усреднения — около двух секунд (60 кадров в секунду).
      // С коротким окном среднее бежит вместе с битом и порог не пробивается.
      avg = avg * 0.992 + energy * 0.008;

      var loud = energy > avg * 1.18 && energy > 24;
      if (loud && now - lastSpawn > MIN_GAP) { lastSpawn = now; spawn(); return; }
    }

    if (now - lastSpawn > MAX_GAP) { lastSpawn = now; spawn(); }
  }

  // Кусок песни короче, чем отрезок ленты под него, — значит повторяем
  // его с начала, а не проваливаемся в тишину.
  audio.addEventListener("timeupdate", function () {
    var track = tracks[trackIndex];
    if (!track) return;
    var from = track.start || 0;
    if (track.duration && audio.currentTime >= from + track.duration) {
      try { audio.currentTime = from; } catch (err) { /* переживём */ }
    }
    if (photos.length) {
      el.progress.style.width = Math.min(100, (shown / photos.length) * 100).toFixed(1) + "%";
    }
  });

  audio.addEventListener("ended", function () {
    // сюда попадаем, только если кусок дотянул до конца файла
    var track = tracks[trackIndex];
    if (!track) return;
    audio.currentTime = track.start || 0;
    audio.play().catch(function () {});
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

    setVolume(1);
    playTrack(0, false);

    plan = planMoments();

    // первый кадр выбрасываем руками, дальше темп держит pulse
    if (photos.length) { preload(0, 5); spawn(); }
    else showMoment();
    lastSpawn = performance.now();
    if (!rafId) pulse();

    poke();
  }

  function finish() {
    cancelAnimationFrame(rafId);
    rafId = null;
    clearTimeout(finaleTimer);
    finaleTimer = null;
    audio.pause();
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
    photoIndex = 0;
    shown = 0;
    momentIndex = 0;
    clearTimeout(finaleTimer);
    finaleTimer = null;
    ending = false;
    el.bar.classList.remove("is-hidden");
    trackIndex = -1;
    setVolume(1);
    playTrack(0, false);
    if (photos.length) spawn();
    lastSpawn = performance.now();
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
    if (trackIndex + 1 < tracks.length) playTrack(trackIndex + 1, true);
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
