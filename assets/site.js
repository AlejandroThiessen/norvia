/* ════════════════════════════════════════════════════════════════════
   NORVIA — site behaviour
   ─────────────────────────────────────────────────────────────────────
     01 helpers            06 pointer spotlight
     02 nav + drawer       07 hero mockups (self-scrolling)
     03 language (EN/ES)   08 gauges
     04 scroll engine      09 real load-time badge
     05 scroll reveal      10 ticker · year

   Everything below degrades to a plain readable page without JS, and
   every motion path is switched off under prefers-reduced-motion.

   EDIT: WhatsApp number lives in WA_NUMBER, one line down.
   ════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* Put your real number here — digits only, with country code.
   Mexico: 52 + 1 + 10-digit number, e.g. '5216251234567'.
   Every WhatsApp link on the page is rebuilt from this value. */
var WA_NUMBER = '521XXXXXXXXXX';
var WA_TEXT   = 'Hola NORVIA, quiero un sitio web para mi negocio.';

/* ── 01 · helpers ─────────────────────────────────────────────────── */
var RM   = matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;

function $(s, c){ return (c || document).querySelector(s); }
function $$(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
function safe(fn){ try { fn(); } catch(err){ if (window.console) console.error(err); } }
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function easeInOut(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

/* ── 02 · WhatsApp links ──────────────────────────────────────────── */
/* Single source of truth: rewrite every [data-wa] href from WA_NUMBER so
   the number only ever has to change in one place. The hrefs in the HTML
   stay as a no-JS fallback. */
safe(function(){
  var href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(WA_TEXT);
  $$('[data-wa]').forEach(function(a){ a.href = href; });
});

/* ── 03 · nav + drawer ────────────────────────────────────────────── */
var nav    = $('#nav');
var burger = $('#burger');
var drawer = $('#drawer');

safe(function(){
  if (!burger || !drawer) return;

  function setDrawer(open){
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function(){
    setDrawer(burger.getAttribute('aria-expanded') !== 'true');
  });
  $$('a', drawer).forEach(function(a){
    a.addEventListener('click', function(){ setDrawer(false); });
  });
  addEventListener('keydown', function(e){
    if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); }
  });
  /* a resize past the breakpoint shouldn't leave the page locked */
  matchMedia('(min-width:861px)').addEventListener('change', function(m){
    if (m.matches) setDrawer(false);
  });
});

/* current section in the nav */
safe(function(){
  var links = $$('.nav__links a');
  if (!links.length || !('IntersectionObserver' in window)) return;

  var map = {};
  links.forEach(function(a){
    var t = $(a.getAttribute('href'));
    if (t) map[t.id] = a;
  });

  var io = new IntersectionObserver(function(rows){
    rows.forEach(function(row){
      var a = map[row.target.id];
      if (!a) return;
      if (row.isIntersecting){
        links.forEach(function(l){ l.classList.remove('is-here'); });
        a.classList.add('is-here');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  Object.keys(map).forEach(function(id){ io.observe($('#' + id)); });
});

/* ── 04 · language toggle (EN / ES) ───────────────────────────────── */
/* Every translated node carries data-es="…". English is cached into
   data-en on the first switch, so the markup only states Spanish once.
   Choice persists in localStorage and can be forced with ?lang=es —
   handy for sending a client a Spanish link directly. */
var LANG_KEY = 'norvia-lang';
var lang = 'en';
try { lang = localStorage.getItem(LANG_KEY) || 'en'; } catch(e){}
var langQ = new URLSearchParams(location.search).get('lang');
if (langQ === 'es' || langQ === 'en') lang = langQ;

function applyLang(l){
  lang = l;
  document.documentElement.lang = l;

  $$('[data-es]').forEach(function(n){
    /* <meta> and <title> carry text in an attribute / as text, not markup */
    if (n.tagName === 'META'){
      if (n.getAttribute('data-en') === null) n.setAttribute('data-en', n.content);
      n.content = n.getAttribute(l === 'es' ? 'data-es' : 'data-en');
      return;
    }
    if (n.getAttribute('data-en') === null) n.setAttribute('data-en', n.innerHTML);
    var html = n.getAttribute(l === 'es' ? 'data-es' : 'data-en');
    if (html !== null && n.innerHTML !== html) n.innerHTML = html;
  });

  /* attribute-only strings */
  $$('[data-es-aria]').forEach(function(n){
    if (n.getAttribute('data-en-aria') === null) n.setAttribute('data-en-aria', n.getAttribute('aria-label') || '');
    n.setAttribute('aria-label', n.getAttribute(l === 'es' ? 'data-es-aria' : 'data-en-aria'));
  });

  $$('#langBtn [data-l]').forEach(function(s){
    s.classList.toggle('is-on', s.getAttribute('data-l') === l);
  });

  try { localStorage.setItem(LANG_KEY, l); } catch(e){}
}

safe(function(){
  function flip(){ applyLang(lang === 'es' ? 'en' : 'es'); }
  var btn = $('#langBtn');
  if (btn) btn.addEventListener('click', flip);
  $$('[data-lang-alt]').forEach(function(b){ b.addEventListener('click', flip); });
  applyLang(lang);
});

/* ── 05 · scroll engine ───────────────────────────────────────────── */
/* One rAF-coalesced pass per scroll: progress bar, nav state, the
   statement parallax layer, the steps rail and the WhatsApp pill. */
var bar = document.createElement('div');
bar.className = 'progress';
bar.setAttribute('aria-hidden', 'true');
document.body.appendChild(bar);

var pill     = $('#waPill');
var stmtBg   = $('.statement__bg');
var stmt     = $('.statement');
var railFill = $('#railFill');
var steps    = $('#steps');
var ticking  = false;

function onScroll(){
  var y  = scrollY || pageYOffset;
  var vh = innerHeight;
  var doc = document.documentElement.scrollHeight - vh;

  bar.style.transform = 'scaleX(' + (doc > 0 ? clamp(y / doc, 0, 1) : 0) + ')';
  if (nav)  nav.classList.toggle('is-stuck', y > 12);
  if (pill) pill.classList.toggle('is-on', y > vh * .85);

  if (stmtBg && stmt && !RM){
    var r = stmt.getBoundingClientRect();
    if (r.bottom > -200 && r.top < vh + 200){
      var p = (vh - r.top) / (vh + r.height);   /* 0 entering → 1 leaving */
      stmtBg.style.setProperty('--py', ((p - .5) * 110).toFixed(1) + 'px');
    }
  }

  if (railFill && steps){
    var s = steps.getBoundingClientRect();
    var prog = clamp((vh * .72 - s.top) / s.height, 0, 1);
    railFill.style.height = (prog * 100).toFixed(1) + '%';
  }

  ticking = false;
}
function queue(){
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onScroll);
}
addEventListener('scroll', queue, { passive:true });
addEventListener('resize', queue);
onScroll();

/* ── 06 · scroll reveal ───────────────────────────────────────────── */
/* .r elements fade up once. Children of a shared parent stagger, so a
   grid of cards arrives as a wave rather than all at once. */
safe(function(){
  var items = $$('.r');
  if (!items.length) return;

  if (RM || !('IntersectionObserver' in window)){
    items.forEach(function(n){ n.classList.add('is-in'); });
    return;
  }

  /* stagger index within each grid-ish parent */
  var GROUPS = '.cards, .work, .gauges, .plans, .facts, .statement__cols';
  $$(GROUPS).forEach(function(g){
    $$(':scope > .r', g).forEach(function(n, i){
      n.style.setProperty('--d', Math.min(i, 7) * 80 + 'ms');
    });
  });

  var io = new IntersectionObserver(function(rows){
    rows.forEach(function(row){
      if (!row.isIntersecting) return;
      row.target.classList.add('is-in');
      io.unobserve(row.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

  items.forEach(function(n){ io.observe(n); });
});

/* steps light up as the rail passes them */
safe(function(){
  var list = $$('.step');
  if (!list.length) return;
  if (RM || !('IntersectionObserver' in window)){
    list.forEach(function(n){ n.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function(rows){
    rows.forEach(function(row){
      if (row.isIntersecting) row.target.classList.add('is-in');
    });
  }, { rootMargin: '-28% 0px -28% 0px' });
  list.forEach(function(n){ io.observe(n); });
});

/* ── 07 · pointer spotlight ───────────────────────────────────────── */
/* Feeds --mx / --my to the card so a soft iris light follows the cursor.
   Mouse-only: pointer events on touch would fire on every tap. */
safe(function(){
  if (!FINE || RM) return;
  $$('.card').forEach(function(card){
    card.addEventListener('pointermove', function(e){
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top)  + 'px');
    });
  });
});

/* ── 08 · hero mockups ────────────────────────────────────────────── */
/* The frames hold real HTML, taller than the window it sits in. We
   translate it so each mock looks like a page being scrolled: hold at
   the top, ease down, hold at the bottom, ease back. No screenshots. */
safe(function(){
  if (RM) return;

  function drive(id, period, delay){
    var mini = $('#' + id);
    if (!mini) return;
    var view = mini.parentNode;

    var span = 0;
    function measure(){ span = Math.max(0, mini.scrollHeight - view.clientHeight); }
    measure();
    addEventListener('resize', measure);

    var HOLD = .16;                       /* share of the cycle spent parked */
    function frame(now){
      if (span > 0 && !document.hidden){
        var t = (((now + delay) % period) / period);      /* 0 → 1 */
        var half = t < .5 ? t * 2 : (1 - t) * 2;          /* 0 →1→ 0 */
        var e = easeInOut(clamp((half - HOLD) / (1 - HOLD * 2), 0, 1));
        mini.style.transform = 'translate3d(0,' + (-e * span).toFixed(1) + 'px,0)';
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  drive('miniA', 17000, 0);
  drive('miniB', 13000, 5200);
});

/* ── 09 · gauges ──────────────────────────────────────────────────── */
/* Sweeps the arc and counts the number up when the group scrolls in. */
safe(function(){
  var group = $('#gauges');
  if (!group) return;

  var gauges = $$('.gauge', group).map(function(g){
    return {
      arc: $('.gauge__arc', g),
      out: $('.gauge__n', g),
      val: parseInt(g.getAttribute('data-v'), 10) || 0
    };
  });

  var C = 2 * Math.PI * 52;   /* circle r=52 in the 120×120 viewBox */

  function run(){
    gauges.forEach(function(g, i){
      if (g.arc) g.arc.style.strokeDashoffset = C * (1 - g.val / 100);
      if (!g.out) return;

      if (RM){ g.out.textContent = g.val; return; }

      var t0 = 0, DUR = 1500, WAIT = i * 110;
      function tick(now){
        if (!t0) t0 = now;
        var t = clamp((now - t0 - WAIT) / DUR, 0, 1);
        g.out.textContent = Math.round(easeInOut(t) * g.val);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  if (RM || !('IntersectionObserver' in window)){ run(); return; }
  var io = new IntersectionObserver(function(rows){
    if (rows[0].isIntersecting){ run(); io.disconnect(); }
  }, { threshold: .35 });
  io.observe(group);
});

/* ── 10 · load-time badge ─────────────────────────────────────────── */
/* This is the page's own measured load time, not a decoration — it reads
   the Navigation Timing entry and counts up to it. If the number ever
   looks bad, that is real feedback about the page, not the badge. */
safe(function(){
  var out = $('#loadN');
  if (!out) return;

  var secs = 0.4;                         /* fallback (e.g. opened via file://) */
  safe(function(){
    var e = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (e && e.domContentLoadedEventEnd > 0) secs = e.domContentLoadedEventEnd / 1000;
    else if (performance.timing){
      var t = performance.timing;
      if (t.domContentLoadedEventEnd && t.navigationStart)
        secs = (t.domContentLoadedEventEnd - t.navigationStart) / 1000;
    }
  });
  secs = clamp(secs, 0.05, 3);

  if (RM){ out.textContent = secs.toFixed(2); return; }

  var t0 = 0, DUR = 1200;
  function tick(now){
    if (!t0) t0 = now;
    var t = clamp((now - t0) / DUR, 0, 1);
    out.textContent = (easeInOut(t) * secs).toFixed(2);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

/* ── 11 · ticker ──────────────────────────────────────────────────── */
/* The strip is written once in the HTML; we clone it so the loop has
   something to run into, then animate the pair by exactly one copy. */
safe(function(){
  var track = $('#tick');
  if (!track) return;
  var run = $('span', track);
  if (!run) return;

  track.appendChild(run.cloneNode(true));
  if (RM) return;

  var w = run.getBoundingClientRect().width;
  if (!w) return;

  var secs = w / 55;                                  /* ~55px per second */
  track.style.animation = 'tickRun ' + secs.toFixed(1) + 's linear infinite';

  var css = document.createElement('style');
  css.textContent = '@keyframes tickRun{to{transform:translate3d(-' + w.toFixed(1) + 'px,0,0)}}';
  document.head.appendChild(css);
});

/* ── 12 · footer year ─────────────────────────────────────────────── */
safe(function(){
  var y = $('#yr');
  if (y) y.textContent = new Date().getFullYear();
});

})();
