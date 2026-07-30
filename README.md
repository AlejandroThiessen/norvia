# NORVIA

Marketing site for a small web-design business in Chihuahua, México.
Hand-written HTML, CSS and JavaScript — no framework, no build step, no
dependencies. Open `index.html` in a browser and it runs.

    index.html            the whole page
    assets/site.css       tokens + every style
    assets/site.js        behaviour
    assets/favicon.svg    the chevron mark

---

## Before it goes live — 3 things

**1. WhatsApp number.** One place:

```js
// assets/site.js, line ~19
var WA_NUMBER = '521XXXXXXXXXX';
```

Digits only, with country code. Mexico is `52` + `1` + the 10-digit
number, e.g. `5216251234567`. Every WhatsApp link on the page is rebuilt
from this value at load.

The `href`s written into `index.html` are the no-JavaScript fallback and
still hold the placeholder. Either leave them (JS covers every real
visitor) or search-and-replace `521XXXXXXXXXX` across `index.html` too.

**2. Email.** `hola@norvia.mx` in the footer — change or remove it.

**3. Canonical URL.** In `<head>`, point it at wherever this ends up
living.

---

## Editing

| What | Where |
|---|---|
| Colors, type, spacing | `assets/site.css` → `:root` |
| Accent (iris) | `--iris` |
| Numbers accent (mint) | `--mint` |
| Prices | search `199` / `29` in `index.html` |
| Spanish copy | every `data-es="…"` attribute |

### Bilingual copy

English lives in the element; Spanish lives beside it in `data-es`:

```html
<h3 data-es="Se ve bien en cualquier celular">Looks right on every phone</h3>
```

`applyLang()` caches the English into `data-en` on the first switch and
swaps `innerHTML` from then on. Same mechanism as the NB Autoworks site,
extended to also handle `<meta>` `content` and `aria-label`
(`data-es-aria`). To translate something new, add a `data-es` and you're
done.

**Default language** is English. To open in Spanish instead, change
`var lang = 'en'` (two places in section 04 of `site.js`) to `'es'`.

`?lang=es` forces Spanish for one visit — useful for sending a client a
Spanish link directly. The choice then persists in `localStorage`.

---

## Notes on how it's built

**The hero mockups** are not screenshots. The browser and phone frames
contain real HTML — a miniature auto-shop site and a miniature butcher
site — scaled down and translated on a `requestAnimationFrame` loop so
each looks like a page being scrolled. Nothing to re-export when the
design changes, and no image weight.

**The load-time badge** shows this page's *actual* measured load, read
from the Navigation Timing API (`domContentLoadedEventEnd`), counted up
from zero. It is not decoration. If that number ever looks bad on real
hosting, that is true feedback about the page — the first thing to
suspect is the Google Fonts request (see below). To pin it to a fixed
number instead, set `secs` in section 10 of `site.js`.

**The Lighthouse gauges** are set in markup, `data-v="100"` per gauge.
They are presented as the standard the work is built toward, not as a
measurement of this page. Run the real audit and put the real numbers in
if you'd rather — Chrome DevTools → Lighthouse.

**Motion** is one curve family (`--e-out`, `--e-expo`, `--e-back`) so
everything moves alike. `prefers-reduced-motion: reduce` switches off
every motion path — orbs, parallax, reveals, gauges, mockups, ticker.

**Without JavaScript** the page is a complete, readable, fully navigable
document. Reveals never hide anything (the `.js` class in `<head>` gates
them), and the FAQ is native `<details>`.

---

## Fonts

Currently loaded from the Google Fonts CDN — Archivo (variable weight +
width), IBM Plex Mono, Instrument Serif.

To self-host the way the client sites do, drop the `.woff2` files into
`assets/fonts/`, replace the `<link>` in `<head>` with `@font-face`
blocks at the top of `site.css`, and keep `font-display: swap`. That
removes two DNS lookups and a blocking stylesheet — worth doing on a
paid host, and it's what makes the load badge honest.

---

## Deploying

Static files. Anything that serves a directory works.

- **GitHub Pages** — push, then Settings → Pages → deploy from branch.
  `.nojekyll` is included so `assets/` is served as-is.
- **Paid hosting** — upload the three files and the assets folder. Make
  sure HTTPS is on and `index.html` is the directory index.

For a client site, the `$29/month` promise means: hosting, TLS, uptime
monitoring, backups, and small content edits. Set the monitor up the day
the site goes live, not the week after someone tells you it's down.
