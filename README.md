# NewOption Partners — website

Static one-page site for NewOption Partners, LLC (independent commercial real estate,
Boulder CO).

No build step. No framework. No client dependencies except Google Fonts.

---

## Deploy

```bash
npm i -g vercel      # once
vercel link          # connect this folder to a Vercel project
vercel --prod
```

Or push to GitHub and import the repo in Vercel. Framework preset: **Other**.
Build command: none. Output directory: none (repo root is served as-is).

Asset paths are relative, so `index.html` also works opened straight from the filesystem —
handy for showing a client without deploying.

No keys or environment variables are needed. `api/contact.js` and `.env.example` are left
over from an earlier version with a contact form; the page no longer calls the endpoint, so
both can be deleted.

---

## Layout

```
index.html          the entire site — markup, styles, script, JSON-LD
img/slide-*.webp    hero slider photography (8)
img/about-tall.webp Who We Are photo
img/team-*.webp     broker portraits
img/clients/*.png   Past Projects logos — single-tone white, see below
og-card.jpg         1200×630 social share card
favicon.svg / .ico / apple-touch-icon.png
robots.txt          crawler rules (AI assistants explicitly allowed)
sitemap.xml
llms.txt            short structured summary for LLMs
llms-full.txt       full page text in one file for LLMs
vercel.json         headers, caching, CSP, redirects
```

Unused files that can be deleted: `img/hero-1…6.webp`, `img/about.webp`, `img/prop-*.webp`,
the eight placeholder SVGs in `img/clients/`, and `index.html.bak-*`.

---

## Page sections

1. Hero slider — images only, no overlay text
2. Statement — H1 "Commercial Real Estate, handled by seasoned professionals."
3. Who We Are — firm copy and the 50+ years stat
4. What We Do — four services
5. The Team — Paul Whiteside and Aaron Evans
6. Past Projects — scrolling client logo marquee
7. Contact — phone, email, office address

## Keeping content in sync

Any copy change in `index.html` should also be made in `llms-full.txt`, and in `llms.txt`
if it touches the summary, services, people or client list. Service names and descriptions
also live in the JSON-LD `hasOfferCatalog` block in the `<head>`. When content changes,
update `<lastmod>` in `sitemap.xml` and `dateModified` in the WebPage JSON-LD node.

## Images and caching

`/img/*` is served with a one-year immutable cache. **Never overwrite an image in place** —
give a changed image a new file name and update the reference, or returning visitors will
keep seeing the old one. The same applies to `og-card.jpg`: social platforms cache share
images aggressively, so a new card should get a new name.

### Adding a hero slide

Add a `.slide` block inside `#slides`, set `width`/`height` on the `<img>`, set `--sk` on the
wrapping `.ph` to the image's average colour (the loading skeleton tone), use
`loading="lazy"` for anything but the first slide, and update the `/ 08` counter. Use
`object-position` on the `<img>` if the subject sits off-centre on narrow screens.

### Adding a client logo

Logos are stored as white artwork on a transparent background (PNG, 96px tall) and shown at
reduced opacity, so every mark reads as the same grey tone. Any white interior detail in the
original artwork should be knocked out to transparent before export.

Each `<img>` carries a `--s` value that scales its displayed height: wide wordmarks run
around 0.5–0.8, compact or stacked marks 1.2–1.65. Add the logo to **both** `<ul class="logos">`
lists (the second copy, with empty `alt`, makes the marquee loop seamlessly), then add the
name to the client lists in `llms.txt` and `llms-full.txt`.

---

## Content notes

- **50+ years stat** is the combined experience of Paul and Aaron. Paul's bio separately says
  "Forty years."
- **Hero photography** is stock office interiors, not NewOption properties.
- **Client logos** were sourced from each company's own website where possible. Crispin
  (formerly CP+B), Kahuna (now Kahuna USA) and Sovos ShipCompliant show their current
  branding. Pharmaca is not included — no usable logo could be found after the company closed.
- **Broker emails.** Both "Email Aaron" and "Email Paul" point at `info@newoptionpartners.com`.

## Accessibility and performance

- Skip link, visible focus rings, labelled controls
- Keyboard support: slider arrows, Escape closes the mobile menu; the logo marquee pauses on
  hover and focus
- `prefers-reduced-motion` stops slider autoplay and turns the marquee into a static,
  centred grid of logos
- Every image carries intrinsic `width`/`height`, so there is no layout shift
- Only the first slide loads up front; the other slides, portraits and logos lazy-load
- Works without JavaScript — a `<noscript>` block reveals images and the full biographies
