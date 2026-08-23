/* ============================================================
   UNDANGAN PERNIKAHAN DIGITAL · Faisal & Detika
   Ganti bagian CONFIG di bawah untuk kustomisasi cepat.
   ============================================================ */
'use strict';

const CONFIG = {
  dateISO: '2026-09-11T08:00:00+07:00',
  audioSrc: 'assets/audio/music-box.mp3',
  shareText: 'Undangan Pernikahan Faisal & Detika · Jumat, 11 September 2026',
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const ANIMATE = HAS_GSAP && !REDUCE;

if (ANIMATE) {
  document.documentElement.classList.add('js');
  window.gsap.registerPlugin(window.ScrollTrigger);
}

/* ============================================================
    1. NAMA TAMU (?to=Nama+Tamu atau /nama-tamu)
    ============================================================ */
(function initGuest() {
  const el = $('#guestName');
  if (!el) return;
  let name = 'Tamu Undangan';
  try {
    const raw = new URLSearchParams(location.search).get('to');
    if (raw && raw.trim()) {
      name = raw.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    } else {
      let path = location.pathname.replace(/^\/+|\/+$/g, '');
      if (path.startsWith('undangan/')) path = path.slice('undangan/'.length);
      if (path && path !== 'manaje.html' && path !== 'undangan') {
        name = decodeURIComponent(path).replace(/[<>]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
      }
    }
  } catch (e) { /* abaikan */ }
  el.textContent = name;
})();

/* ============================================================
   2. TOAST
   ============================================================ */
const Toast = (() => {
  const el = $('#toast');
  let timer = null;
  function show(msg, ms = 2400) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-show'), ms);
  }
  return { show };
})();
window.__toast = Toast.show;

/* ============================================================
   3. MUSIK LATAR
   ============================================================ */
const Music = (() => {
  let audio = null;
  let fadeTimer = null;

  function ensure() {
    if (!audio) {
      try {
        audio = new Audio(CONFIG.audioSrc);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
      } catch (e) { audio = null; }
    }
    return audio;
  }

  function fade(target, done) {
    clearInterval(fadeTimer);
    const a = ensure();
    if (!a) { if (done) done(); return; }
    fadeTimer = setInterval(() => {
      const diff = target - a.volume;
      if (Math.abs(diff) < 0.05) {
        a.volume = target;
        clearInterval(fadeTimer);
        if (done) done();
      } else {
        a.volume += Math.sign(diff) * 0.05;
      }
    }, 70);
  }

  function setUI(on) {
    const btn = $('#musicToggle');
    if (!btn) return;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Jeda musik latar' : 'Putar musik latar');
  }

  function play() {
    const a = ensure();
    if (!a) return;
    const p = a.play();
    if (p && p.catch) p.catch(() => Toast.show('Ketuk tombol musik untuk memutar.'));
    fade(0.45, () => setUI(!a.paused));
    setUI(true);
  }

  function pause() {
    if (!audio) return;
    fade(0, () => {
      audio.pause();
      setUI(false);
    });
  }

  function reset() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
    setUI(false);
  }

  function toggle() {
    if (!audio || audio.paused) play();
    else pause();
  }

  return { play, pause, reset, toggle };
})();

$('#musicToggle').addEventListener('click', Music.toggle);

/* ============================================================
   4. HITUNG MUNDUR
   ============================================================ */
(function initCountdown() {
  const els = {
    d: $('#cdDays'), h: $('#cdHours'), m: $('#cdMinutes'), s: $('#cdSeconds'),
  };
  const grid = $('#countdownGrid');
  const done = $('#countdownDone');
  const target = new Date(CONFIG.dateISO).getTime();
  const pad = (n) => String(n).padStart(2, '0');

  function setCell(el, val) {
    if (!el || el.textContent === val) return;
    el.textContent = val;
    if (ANIMATE && window.gsap) {
      window.gsap.fromTo(el,
        { rotationX: -88, autoAlpha: 0, scale: .85 },
        { rotationX: 0, autoAlpha: 1, scale: 1, duration: .65, ease: 'back.out(1.8)', transformPerspective: 420, overwrite: 'auto' });
    }
  }

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      grid.hidden = true;
      done.hidden = false;
      clearInterval(timer);
      return;
    }
    const sec = Math.floor(diff / 1000);
    setCell(els.d, pad(Math.floor(sec / 86400)));
    setCell(els.h, pad(Math.floor((sec % 86400) / 3600)));
    setCell(els.m, pad(Math.floor((sec % 3600) / 60)));
    setCell(els.s, pad(sec % 60));
  }

  const timer = setInterval(tick, 1000);
  tick();
})();

/* ============================================================
   5. KELOPAK JATUH (canvas)
   ============================================================ */
(function petals() {
  if (REDUCE) return;
  const cv = $('#petals');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const COLORS = ['192,136,102', '230,230,230', '158,107,77'];
  let W = 0, H = 0, dpr = 1;
  let list = [];
  let running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(38, Math.max(18, Math.round(W / 42)));
    list = Array.from({ length: n }, () => spawn(true));
  }

  function spawn(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -20,
      s: 5 + Math.random() * 9,
      vy: 18 + Math.random() * 26,
      swayA: 24 + Math.random() * 40,
      swayF: 0.4 + Math.random() * 0.7,
      ph: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (-0.5 + Math.random()) * 0.6,
      a: 0.18 + Math.random() * 0.32,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      ph0: Math.random() * Math.PI * 2,
    };
  }

  function drawPetal(p) {
    const dz = 0.68 + 0.32 * Math.sin(p.ph * 1.3 + p.ph0);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(dz, dz);
    ctx.beginPath();
    ctx.moveTo(0, -p.s);
    ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.45, p.s * 0.65, p.s * 0.6, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.65, p.s * 0.6, -p.s * 0.9, -p.s * 0.45, 0, -p.s);
    ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
    ctx.fill();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.ph += p.swayF * dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.ph) * p.swayA * dt;
      p.rot += p.vr * dt;
      if (p.y > H + 30) list[i] = spawn(false);
      drawPetal(p);
    }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });
  requestAnimationFrame(frame);
})();

/* ============================================================
   6. SAMPUL: BUKA UNDANGAN
   ============================================================ */
(function initCover() {
  const cover = $('#cover');
  const content = $('#coverContent');
  const openBtn = $('#openBtn');
  const musicToggle = $('#musicToggle');
  const homeToggle = $('#homeToggle');
  const dockNav = $('#dockNav');

  function revealControls() {
    musicToggle.hidden = false;
    homeToggle.hidden = false;
    dockNav.hidden = false;
    if (ANIMATE && window.gsap) {
      window.gsap.fromTo([musicToggle, homeToggle], { autoAlpha: 0 }, { autoAlpha: 1, duration: .9, delay: .8, ease: 'power2.out' });
    }
  }

  function finishOpen() {
    document.body.classList.add('is-opened');
    document.documentElement.classList.remove('pre-open');
    revealControls();
    initScrollFx();
  }

  function instantOpen() {
    cover.style.display = 'none';
    finishOpen();
  }

  if (!ANIMATE) {
    openBtn.addEventListener('click', () => { Music.play(); instantOpen(); });
    return;
  }

  /* intro kemunculan sampul saat halaman dibuka */
  const coverItems = $$('[data-cover]');
  const corners = $$('.corner');
  window.gsap.set(corners, { autoAlpha: 0, scale: .4 });
  window.gsap.set(coverItems, { autoAlpha: 0, y: 30 });
  const coverIntro = window.gsap.timeline({ delay: .1 })
    .to(corners, { autoAlpha: 1, scale: 1, duration: .65, ease: 'back.out(2.2)', stagger: .07 })
    .to(coverItems, { autoAlpha: 1, y: 0, duration: .85, ease: 'power3.out', stagger: .08 }, '-=.4');

  openBtn.addEventListener('click', () => {
    if (window.__coverOpened) return;
    window.__coverOpened = true;
    Music.play();
    if (coverIntro) coverIntro.kill();
    confettiBurst(openBtn);

    cover.classList.add('is-opening');
    const shadow = $('.cover__shadow');
    window.gsap.timeline({ defaults: { ease: 'power2.in' } })
      .to('[data-cover]', { y: -34, autoAlpha: 0, duration: 0.55, stagger: 0.07 }, 0)
      .to('.cover__frame', { autoAlpha: 0, scale: .96, duration: 0.55, ease: 'power2.out' }, 0)
      .to(shadow, { autoAlpha: 1, duration: 0.5 }, 0.05)
      .to('.cover__half--top', {
        rotationX: 70, transformOrigin: '50% 100%',
        boxShadow: '0 24px 80px -20px rgba(0,0,0,.9), 0 0 60px rgba(192,136,102,.25)',
        duration: 1.5, ease: 'expo.inOut',
      }, '-=0.15')
      .to('.cover__half--bottom', {
        rotationX: -70, transformOrigin: '50% 0%',
        boxShadow: '0 -24px 80px -20px rgba(0,0,0,.9), 0 0 60px rgba(192,136,102,.25)',
        duration: 1.5, ease: 'expo.inOut',
      }, '<')
      .to(['.cover__half--top', '.cover__half--bottom'], { autoAlpha: 0, duration: 0.4 }, '-=0.3')
      .to(shadow, { autoAlpha: 0, duration: 0.4 }, '-=0.35')
      .call(finishOpen, null, '-=0.65')
      .set(cover, { display: 'none' });
  });
})();

  /* ============================================================
    6b. KEMBALI KE SAMPUL / ATAS
    ============================================================ */
  window.__coverOpened = false;
  (function initHomeToggle() {
    const btn = $('#homeToggle');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cover = $('#cover');
      const isCoverClosed = cover && cover.style.display === 'none';
      if (isCoverClosed) {
        cover.style.display = '';
        cover.classList.remove('is-opening');
        const shadow = $('.cover__shadow');
        const halves = $$('.cover__half');
        const items = $$('[data-cover]');
        const frame = $('.cover__frame');
        const corners = $$('.corner');
        window.gsap.set(halves, { autoAlpha: 1, rotationX: 0, clearProps: 'boxShadow' });
        window.gsap.set(items, { autoAlpha: 1, y: 0, clearProps: 'all' });
        window.gsap.set(frame, { autoAlpha: 1, scale: 1, clearProps: 'all' });
        window.gsap.set(corners, { autoAlpha: 1, scale: 1, clearProps: 'all' });
        if (shadow) window.gsap.set(shadow, { autoAlpha: 0 });
        $('#musicToggle').hidden = true;
        $('#dockNav').hidden = true;
        btn.hidden = true;
        window.__coverOpened = false;
        Music.reset();
        const intro = window.gsap.timeline({ delay: .1 })
          .to(corners, { autoAlpha: 1, scale: 1, duration: .65, ease: 'back.out(2.2)', stagger: .07 })
          .to(items, { autoAlpha: 1, y: 0, duration: .85, ease: 'power3.out', stagger: .08 }, '-=.4');
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
      }
      if (ANIMATE) {
        window.gsap.fromTo(btn, { scale: .9 }, { scale: 1, duration: .4, ease: 'back.out(2.2)', overwrite: true });
      }
    });
  })();

/* ============================================================
   7. SCROLL EFFECTS (ScrollTrigger) + lapisan gerak 3D
   ============================================================ */
function initScrollFx() {
  if (!ANIMATE || initScrollFx.done) return;
  initScrollFx.done = true;
  const g = window.gsap;

  /* reveal per elemen — panel masuk dengan rotasi 3D, timeline menyamping */
  $$('[data-reveal]').forEach((el) => {
    el.dataset.revealed = '0';
    const from = { opacity: 0, y: 44 };
    const to = { opacity: 1, y: 0, duration: 1.05, ease: 'power3.out' };
    if (el.classList.contains('panel')) {
      Object.assign(from, { y: 80, rotationX: -20, scale: .94, transformPerspective: 900 });
      Object.assign(to, { rotationX: 0, scale: 1, transformPerspective: 900, duration: 1.25 });
    } else if (el.classList.contains('titem')) {
      const left = el.classList.contains('titem--left');
      Object.assign(from, { y: 0, x: left ? -80 : 80, rotationY: left ? -22 : 22, scale: .92, transformPerspective: 820 });
      Object.assign(to, { x: 0, rotationY: 0, scale: 1, transformPerspective: 820, duration: 1.2 });
    }
    to.scrollTrigger = { trigger: el, start: 'top 86%', toggleActions: 'play none none reverse' };
    to.onComplete = () => { el.dataset.revealed = '1'; };
    to.onReverseComplete = () => { el.dataset.revealed = '0'; };
    g.fromTo(el, from, to);
  });

  /* reveal berkelompok (stagger) — anak bergantian melayang dari kiri/kanan */
  $$('[data-reveal-group]').forEach((group) => {
    const kids = Array.from(group.children);
    kids.forEach((k) => { if (!k.hasAttribute('data-reveal')) k.dataset.revealed = '0'; });
    g.fromTo(kids,
      { opacity: 0, y: 60, rotationY: (i) => (i % 2 ? 12 : -12), scale: .94, transformPerspective: 880 },
      {
        opacity: 1, y: 0, rotationY: 0, scale: 1, transformPerspective: 880,
        duration: 1.1, ease: 'power3.out', stagger: 0.13,
        scrollTrigger: { trigger: group, start: 'top 85%', toggleActions: 'play none none reverse' },
        onComplete: () => kids.forEach((k) => { k.dataset.revealed = '1'; }),
        onReverseComplete: () => kids.forEach((k) => { k.dataset.revealed = '0'; }),
      });
  });

  /* intro hero — sekali bagian dari sistem gulir: main saat sampul terbuka,
     terbalik saat posisi kembali, lalu main lagi. Posisi hero di puncak dokumen
     membuat "terbalik" hanya terjadi bila viewport sempat turun melewati start. */
  window.gsap.set('[data-hero-emblem]', { autoAlpha: 0, scale: .55, rotationY: -150, transformPerspective: 700 });
  window.gsap.set('.rise-mask__inner', { yPercent: 120 });
  window.gsap.set('[data-hero-arch]', { autoAlpha: 0, y: 46, scale: .96 });
  window.gsap.set(['[data-hero-fade]', '.flourish', '.scroll-cue'], { autoAlpha: 0 });
  window.gsap.timeline({
    scrollTrigger: { trigger: '#beranda', start: 'top 70%', toggleActions: 'play none none reverse' },
  })
    .fromTo('[data-hero-emblem]',
      { autoAlpha: 0, scale: .55, rotationY: -150, transformPerspective: 700 },
      { autoAlpha: 1, scale: 1, rotationY: 0, duration: 1.15, ease: 'back.out(1.7)' }, 0.05)
    .fromTo('.rise-mask__inner',
      { yPercent: 120 },
      { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.14 }, 0.1)
    .fromTo('[data-hero-arch]',
      { autoAlpha: 0, y: 46, scale: .96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 1.35, ease: 'expo.out' }, 0.18)
    .fromTo('[data-hero-fade]',
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.16 }, '-=0.95')
    .fromTo('.flourish',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.8, stagger: 0.12 }, '<')
    .fromTo('.scroll-cue',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.8 }, '-=0.4');

  /* judul section dipecah per karakter → kaskade 3D */
  $$('.section-head h2, .countdown__title').forEach((h) => {
    if (h.dataset.split) return;
    h.dataset.split = '1';
    const text = h.textContent;
    h.setAttribute('aria-label', text.trim());
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      frag.appendChild(s);
    }
    h.textContent = '';
    h.appendChild(frag);
    g.fromTo(h.querySelectorAll('.ch'),
      { yPercent: 70, autoAlpha: 0, rotationX: -45, transformPerspective: 520 },
      {
        yPercent: 0, autoAlpha: 1, rotationX: 0,
        duration: .85, ease: 'back.out(1.5)', stagger: .02,
        scrollTrigger: { trigger: h, start: 'top 87%', toggleActions: 'play none none reverse' },
      });
  });

  /* garis timeline tumbuh mengikuti gulir */
  const line = $('.timeline__line');
  if (line) {
    g.fromTo(line, { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#timeline', start: 'top 72%', end: 'bottom 58%', scrub: 0.6 },
    });
  }

  /* paralaks ringan */
  g.to('[data-hero-arch]', {
    yPercent: -10, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  $$('.flourish').forEach((f, i) => {
    g.to(f, {
      y: i % 2 === 0 ? 32 : -32, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });
  g.to('.hero__emblem', {
    yPercent: -14, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* hero mundur ke kedalaman saat digulir */
  g.to('.hero__inner', {
    yPercent: -12, scale: .92, autoAlpha: .25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true },
  });

  /* marquee melengkung mengikuti kecepatan gulir */
  const track = $('.marquee__track');
  if (track) {
    const proxy = { s: 0 };
    const setSkew = g.quickSetter(track, 'skewX', 'deg');
    ScrollTrigger.create({
      onUpdate(self) {
        const target = gsap.utils.clamp(-7, 7, self.getVelocity() / -350);
        gsap.to(proxy, {
          s: target, duration: .5, ease: 'power3.out', overwrite: true,
          onUpdate: () => setSkew(proxy.s),
        });
      },
    });
  }

  /* progress gulir emas */
  const bar = $('#progressBar');
  if (bar) {
    g.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .3 },
    });
  }

  /* cahaya ambient mengikuti gerakan gulir */
  const ambient = $('.ambient');
  if (ambient) {
    const ambProxy = { y: 0 };
    const setAmbY = g.quickSetter(ambient, 'y', 'px');
    ScrollTrigger.create({
      onUpdate(self) {
        const target = gsap.utils.clamp(-40, 40, self.getVelocity() / -800);
        gsap.to(ambProxy, {
          y: target, duration: .8, ease: 'power3.out', overwrite: true,
          onUpdate: () => setAmbY(ambProxy.y),
        });
      },
    });
  }

  initTilt();
  window.addEventListener('load', () => window.ScrollTrigger.refresh());
}

/* ---------- tilt 3D mengikuti pointer (perangkat ber-mouse saja) ---------- */
function initTilt() {
  if (!ANIMATE || initTilt.done) return;
  initTilt.done = true;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const g = window.gsap;

  /* foto hero miring mengikuti posisi pointer di seluruh area hero */
  const hero = $('.hero');
  const archCard = $('.hero__arch .arch-frame');
  if (hero && archCard) {
    g.set(archCard, { transformPerspective: 950 });
    const arx = g.quickTo(archCard, 'rotationX', { duration: .8, ease: 'power3.out' });
    const ary = g.quickTo(archCard, 'rotationY', { duration: .8, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      ary(px * 10);
      arx(py * -7);
    });
    hero.addEventListener('pointerleave', () => { arx(0); ary(0); });
  }

  $$('.event, .bankcard, .rsvp, .gitem, .person__photo').forEach((card) => {
    card.classList.add('tilt');
    card.dataset.revealed = card.dataset.revealed || '1';
    g.set(card, { transformPerspective: 750 });
    const isEvent = card.classList.contains('event');
    const isGitem = card.classList.contains('gitem');
    const maxRy = isEvent ? 12 : isGitem ? 10 : 9;
    const maxRx = isEvent ? 10 : isGitem ? 8 : 8;
    const maxSc = isEvent ? 1.04 : isGitem ? 1.03 : 1.02;
    const rx = g.quickTo(card, 'rotationX', { duration: .55, ease: 'power3.out' });
    const ry = g.quickTo(card, 'rotationY', { duration: .55, ease: 'power3.out' });
    const sc = g.quickTo(card, 'scale', { duration: .55, ease: 'power3.out' });

    card.addEventListener('pointermove', (e) => {
      if (card.dataset.revealed !== '1') return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      ry(px * maxRy);
      rx(py * -maxRx);
    });
    card.addEventListener('pointerenter', () => {
      if (card.dataset.revealed !== '1') return;
      sc(maxSc);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); sc(1); });
  });
}

/* ============================================================
    8. GALERI + LIGHTBOX
    ============================================================ */
(function initGallery() {
  const grid = $('#galleryGrid');
  const box = $('#lightbox');
  if (!grid || !box) return;

  const items = $$('.gitem', grid).map((fig) => ({
    src: $('img', fig).getAttribute('src'),
    alt: $('img', fig).getAttribute('alt') || '',
    cap: $('figcaption', fig).textContent.trim(),
    fig,
  }));

  const img = $('#lbImg');
  const capEl = $('#lbCaption');
  const counter = $('#lbCounter');
  const closeBtn = $('#lbClose');
  const prevBtn = $('#lbPrev');
  const nextBtn = $('#lbNext');
  const zoomInBtn = $('#lbZoomIn');
  const zoomOutBtn = $('#lbZoomOut');
  const zoomResetBtn = $('#lbZoomReset');
  const downloadBtn = $('#lbDownload');
  const shareBtn = $('#lbShare');
  let idx = 0;
  let lastFocus = null;
  let zoom = 1;

  function setZoom(z) {
    zoom = Math.min(4, Math.max(1, z));
    img.style.transform = 'scale(' + zoom + ')';
    img.style.transition = 'transform .25s var(--ease-out, cubic-bezier(.16,1,.3,1))';
  }

  function render() {
    const it = items[idx];
    img.src = it.src;
    img.alt = it.alt;
    capEl.textContent = it.cap;
    counter.textContent = (idx + 1) + ' / ' + items.length;
    setZoom(1);
  }

  function open(i) {
    idx = i;
    render();
    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => box.classList.add('is-open'));
    closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    box.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      box.hidden = true;
      document.body.style.overflow = '';
    }, REDUCE ? 0 : 400);
    if (lastFocus) lastFocus.focus();
  }

  function step(d) {
    idx = (idx + d + items.length) % items.length;
    render();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  items.forEach((it, i) => {
    it.fig.addEventListener('click', () => open(i));
    it.fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
    });
  });
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(zoom + .25));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(zoom - .25));
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => setZoom(1));
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      try {
        const a = document.createElement('a');
        a.href = img.src;
        a.download = 'foto-undangan-' + (idx + 1) + '.jpg';
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        Toast.show('Mengunduh foto...');
      } catch (e) {
        Toast.show('Gagal mengunduh, coba klik kanan > Simpan gambar.');
      }
    });
  }
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const it = items[idx];
      try {
        if (navigator.share) {
          await navigator.share({ title: document.title, text: it.cap || 'Foto undangan pernikahan', url: it.src });
        } else {
          await navigator.clipboard.writeText(it.src);
          Toast.show('Tautan foto tersalin.');
        }
      } catch (e) { /* dibatalkan */ }
    });
  }

  box.addEventListener('wheel', (e) => {
    if (!box.hidden) {
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? .15 : -.15));
    }
  }, { passive: false });
})();

/* ============================================================
    9. UCAPAN & DOA (RSVP + buku tamu)
    ============================================================ */
(function initWishes() {
  const KEY = 'fd-wishes-v1';
  const listEl = $('#wishesList');
  const metaEl = $('#wishesMeta');
  const form = $('#rsvpForm');
  if (!listEl || !form) return;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(saved) ? saved.sort((x, y) => y.t - x.t) : [];
    } catch (e) { return []; }
  }

  function save(wishes) {
    try {
      localStorage.setItem(KEY, JSON.stringify(wishes));
    } catch (e) { /* penyimpanan tidak tersedia */ }
  }

  function relTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return m + ' menit lalu';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' jam lalu';
    const d = Math.floor(h / 24);
    if (d === 1) return 'kemarin';
    if (d < 30) return d + ' hari lalu';
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function chip(text, cls) {
    const span = document.createElement('span');
    span.className = 'wish__chip' + (cls ? ' ' + cls : '');
    span.textContent = text;
    return span;
  }

  function render(wishes, highlightFirst) {
    listEl.textContent = '';
    metaEl.hidden = wishes.length === 0;

    if (wishes.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'wishes__empty';
      empty.textContent = 'Belum ada ucapan & doa. Jadilah yang pertama memberikan restu untuk kedua mempelai.';
      listEl.appendChild(empty);
      return;
    }

    wishes.slice(0, 50).forEach((w, i) => {
      const li = document.createElement('li');
      li.className = 'wish' + (highlightFirst && i === 0 ? ' is-new' : '');

      const av = document.createElement('div');
      av.className = 'wish__avatar';
      av.textContent = (w.n || '?').trim().charAt(0).toUpperCase();

      const body = document.createElement('div');

      const head = document.createElement('div');
      head.className = 'wish__head';

      const nm = document.createElement('span');
      nm.className = 'wish__name';
      nm.textContent = w.n;

      head.appendChild(nm);
      head.appendChild(chip(w.a === 'hadir' ? 'Hadir' : 'Berhalangan', w.a === 'hadir' ? '' : 'wish__chip--absent'));

      const tm = document.createElement('time');
      tm.className = 'wish__time';
      tm.textContent = relTime(w.t);

      head.appendChild(tm);

      const msg = document.createElement('p');
      msg.className = 'wish__msg';
      msg.textContent = w.m;

      body.appendChild(head);
      body.appendChild(msg);
      li.appendChild(av);
      li.appendChild(body);
      listEl.appendChild(li);
    });

    const total = wishes.length;
    const hadir = wishes.filter((w) => w.a === 'hadir').length;
    metaEl.textContent = '';
    const c1 = document.createElement('span');
    c1.className = 'chip';
    c1.innerHTML = '<b>' + total + '</b> ucapan';
    const c2 = document.createElement('span');
    c2.className = 'chip chip--dim';
    c2.innerHTML = '<b>' + hadir + '</b> akan hadir';
    metaEl.appendChild(c1);
    metaEl.appendChild(c2);
  }

  /* jumlah tamu hanya relevan bila hadir */
  const guestField = $('#guestCountField');
  $$('input[name="hadir"]').forEach((r) => {
    r.addEventListener('change', () => {
      const val = form.querySelector('input[name="hadir"]:checked').value;
      guestField.hidden = val !== 'hadir';
    });
  });

  /* hitung karakter ucapan */
  const msgEl = $('#rsvpMsg');
  const msgCount = $('#msgCount');
  if (msgEl && msgCount) {
    msgCount.textContent = '0 / 500';
    msgEl.addEventListener('input', () => {
      const len = msgEl.value.length;
      msgCount.textContent = len + ' / 500';
      msgCount.style.color = len > 450 ? 'var(--error)' : '';
    });
  }

  function setError(inputId, errId, bad) {
    $('#' + inputId).closest('.field').classList.toggle('has-error', bad);
    $('#' + errId).hidden = !bad;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#rsvpName');
    const msg = $('#rsvpMsg');
    const hadir = form.querySelector('input[name="hadir"]:checked').value;
    const guests = parseInt($('#rsvpGuests').value, 10);

    const badName = name.value.trim().length < 2;
    const badMsg = msg.value.trim().length < 3;
    setError('rsvpName', 'errName', badName);
    setError('rsvpMsg', 'errMsg', badMsg);
    if (badName || badMsg) {
      Toast.show('Lengkapi dulu nama dan ucapan Anda.');
      return;
    }

    const wishes = load();
    wishes.unshift({
      n: name.value.trim(),
      a: hadir,
      g: hadir === 'hadir' ? guests : 0,
      m: msg.value.trim(),
      t: Date.now(),
    });
    save(wishes);
    render(wishes, true);

    confettiBurst($('#rsvpSubmit'));
    Toast.show('Terima kasih! Ucapan dan doa Anda telah terkirim.');
    msg.value = '';

    showConfirmCard(name.value.trim(), hadir, hadir === 'hadir' ? guests : 0);
  });

  render(load(), false);
})();

/* ============================================================
    9b. KARTU KONFIRMASI RSVP
    ============================================================ */
(function initConfirmCard() {
  const card = $('#confirmCard');
  const inner = $('#confirmCardInner');
  const namesEl = $('#confirmNames');
  const statusEl = $('#confirmStatus');
  const guestsEl = $('#confirmGuests');
  const saveBtn = $('#saveCardBtn');
  const closeBtn = $('#closeCardBtn');
  if (!card || !inner) return;

  function open() {
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  }
  function close() {
    card.classList.remove('is-open');
    setTimeout(() => {
      card.hidden = true;
      document.body.style.overflow = '';
    }, REDUCE ? 0 : 400);
  }
  window.__closeConfirmCard = close;

  closeBtn.addEventListener('click', close);
  card.addEventListener('click', (e) => { if (e.target === card) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !card.hidden) close(); });

  window.showConfirmCard = function(name, hadir, guests) {
    namesEl.textContent = name;
    statusEl.textContent = hadir === 'hadir' ? 'Hadir' : 'Berhalangan';
    guestsEl.textContent = (hadir === 'hadir' ? guests : 0) + ' orang';
    open();
  };

  saveBtn.addEventListener('click', async () => {
    if (!window.html2canvas) {
      Toast.show('Fitur simpan gambar tidak tersedia saat ini.');
      return;
    }
    saveBtn.disabled = true;
    try {
      const canvas = await html2canvas(inner, {
        backgroundColor: '#1a0f0d',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = 'konfirmasi-' + (namesEl.textContent || 'tamu').replace(/\s+/g, '-').toLowerCase() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      Toast.show('Kartu konfirmasi berhasil disimpan.');
    } catch (err) {
      Toast.show('Gagal menyimpan gambar, silakan screenshot manual.');
    } finally {
      saveBtn.disabled = false;
    }
  });
})();

/* konfeti kecil saat kirim ucapan */
function confettiBurst(origin) {
  if (!ANIMATE || !origin) return;
  const rect = origin.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#c08866', '#9e6b4d', '#e6e6e6', '#c4c4c4'];
  for (let i = 0; i < 26; i++) {
    const c = document.createElement('span');
    c.className = 'confetto';
    c.style.left = cx + 'px';
    c.style.top = cy + 'px';
    c.style.background = colors[i % colors.length];
    document.body.appendChild(c);
    const dx = (Math.random() - 0.5) * 300;
    const up = -(60 + Math.random() * 140);
    const fall = 160 + Math.random() * 200;
    window.gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { x: dx * 0.6, y: up, rotation: Math.random() * 360, duration: 0.5, ease: 'power2.out' })
      .to(c, { x: dx, y: fall, rotation: '+=' + (Math.random() * 360), opacity: 0, duration: 0.85, ease: 'power1.in' });
  }
}

/* ============================================================
   10. SALIN REKENING / ALAMAT
   ============================================================ */
(function initCopy() {
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  $$('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || '';
      const ok = await copyText(text);
      Toast.show(ok ? 'Tersalin ke papan klip.' : 'Gagal menyalin, silakan salin manual.');
      if (ok && ANIMATE) {
        window.gsap.fromTo(btn, { scale: 1 }, { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' });
      }
    });
  });
})();

/* ============================================================
   11. NAVIGASI AKTIF (scroll spy)
   ============================================================ */
(function initSpy() {
  const links = $$('.docknav__link');
  if (!links.length) return;
  const map = new Map();
  links.forEach((l) => {
    const sec = $(l.getAttribute('href'));
    if (sec) map.set(sec, l);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((l) => l.classList.remove('active'));
        const link = map.get(en.target);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-38% 0px -52% 0px' });
  map.forEach((_, sec) => io.observe(sec));
})();

/* ============================================================
   12. BAGIKAN UNDANGAN
   ============================================================ */
(function initShare() {
  const btn = $('#shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const path = location.pathname.replace(/^\/+|\/+$/g, '');
    const base = location.origin + '/';
    let url = location.href.split('?')[0];
    if (path && path !== 'manaje.html' && path !== 'undangan' && !url.endsWith(path)) {
      url = base + path;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text: CONFIG.shareText, url });
        return;
      } catch (e) { /* dibatalkan pengguna */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      Toast.show('Tautan undangan tersalin.');
    } catch (e) {
      Toast.show(url);
    }
  });
})();

/* ============================================================
   13. CADANGAN FOTO GAGAL MUAT
   ============================================================ */
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t.tagName !== 'IMG' || t.dataset.fallback) return;
  t.dataset.fallback = '1';
  t.src = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">' +
    '<rect width="600" height="800" fill="#1a0f0d"/>' +
    '<path d="M300 340l14 34 34 14-34 14-14 34-14-34-34-14 34-14z" fill="#9e6b4d"/>' +
    '</svg>');
}, true);
