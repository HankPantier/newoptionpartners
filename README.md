# NewOption Partners — website

Static one-page site for NewOption Partners, LLC (boutique commercial real estate, Boulder CO),
with a single Vercel serverless function for the contact form.

No build step. No framework. No client dependencies except Google Fonts and the HERE Maps
JavaScript API.

---

## Keys and secrets at a glance

| Key | Where it lives | Public? | Needed for |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Vercel env var | **secret** | Sending contact-form email |
| `CONTACT_TO` | Vercel env var | not secret | Where enquiries land |
| `CONTACT_FROM` | Vercel env var | not secret | Sender address (Resend-verified domain) |
| `CONTACT_BCC` | Vercel env var, optional | not secret | Silent copies |
| HERE Maps JS key | hard-coded in `index.html` | **public** | The office map |

Nothing else needs a key. Google Fonts is unauthenticated.

## Deploy

```bash
npm i -g vercel      # once
vercel link          # connect this folder to a Vercel project
vercel --prod
```

Or push to GitHub and import the repo in Vercel. Framework preset: **Other**.
Build command: none. Output directory: none (repo root is served as-is).

Asset paths are relative, so `index.html` also works if you just open it from the
filesystem — handy for showing a client without deploying. The one thing that won't work
that way is the contact form, which needs `/api/contact` (use `vercel dev` for that).

### Environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production + Preview):

| Variable | Required | Example |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | `re_xxxxxxxxxxxx` |
| `CONTACT_TO` | yes | `info@newoptionpartners.com` (comma-separate for several) |
| `CONTACT_FROM` | yes | `NewOption Website <website@mail.newoptionpartners.com>` |
| `CONTACT_BCC` | no | `paul@…,aaron@…` |

`CONTACT_FROM` **must** be on a domain verified in Resend → Domains. A subdomain such as
`mail.newoptionpartners.com` is the usual choice so that website mail can't affect the
deliverability reputation of the main domain.

`.env.example` has the same list for local `vercel dev`.

### HERE Maps key

The office map under the contact form uses the HERE Maps API for JavaScript v3.2.
**A key is already set** in `index.html`, in the config block at the top of the `<script>`:

```js
var HERE_API_KEY = "hitUcQ4JMK5Enon9p8kmror_IXMsZDtFHVvBIgeNrJI";
```

This key is public by design — it ships in the page source, exactly like a Google Maps
JS key. What protects it is the domain allow-list, so **before launch**, in the HERE
console (platform.here.com → your project → the JavaScript key), restrict it to:

- `newoptionpartners.com`
- `www.newoptionpartners.com`
- your Vercel preview domain, if you want the map working on previews

The map lazy-loads only when it scrolls into view, and the address panel is not swapped out
until tiles have actually arrived and a canvas has real dimensions. If HERE is unreachable,
or the key is removed, rejected or over quota, the panel simply stays — you get the address
and a link out rather than a blank grey rectangle, and a warning in the console.

Note: the map cannot load inside a Claude artifact preview. That viewer's content-security
policy only allows scripts from a short list of CDNs, and `js.api.here.com` isn't on it, so
the preview always shows the fallback panel. Open the file locally or deploy to see the map.

---

## Layout

```
index.html          the entire site — markup, styles, script, JSON-LD
api/contact.js      POST /api/contact → Resend
img/                WebP photography + PNG wordmarks
og-cover.jpg        1200×630 social card
favicon.svg / .ico / apple-touch-icon.png
robots.txt          crawler rules (AI assistants explicitly allowed)
sitemap.xml
llms.txt            short structured summary for LLMs
llms-full.txt       full page text in one file for LLMs
vercel.json         headers, caching, CSP, redirects
```

---

## Contact form

Front end validates first name and email, then POSTs JSON to `/api/contact`.
The function:

- rejects anything but POST
- silently accepts and discards submissions where the `company_website` honeypot is filled
- rate-limits to 5 posts per IP per minute, per serverless instance
- trims and length-caps every field, HTML-escapes everything into the email body
- sets `reply_to` to the sender, so replying from the inbox answers the enquiry directly
- returns `{ ok: true }` or `{ error: "…" }` with a human-readable message

Nothing is stored. If a record of enquiries is wanted later, add a database write alongside
the Resend call.

### Testing locally

```bash
vercel dev
```

Then submit the form at <http://localhost:3000>. Without `RESEND_API_KEY` set the endpoint
returns a 500 with "The contact form is not configured yet" — which is what the front end
will display.

---

## Content notes

Things worth confirming before or shortly after launch:

- **Property details.** Type and lease/sale status for 630 15th Avenue, 2790 Valmont Road and
  7225 Lowell Blvd are inferred, not supplied. They appear in `index.html`, `llms.txt` and
  `llms-full.txt` — update all three together.
- **Headline stats** (40+ years / 300K SF / 19 buildings) are drawn from Paul's biography.
- **Broker emails.** Both "Email Aaron" and "Email Paul" currently point at
  `info@newoptionpartners.com`.
- **Hero photography** is stock office interiors, not NewOption properties.
- **Logo tagline.** The supplied wordmark PNG crops mid-word at "NEW SPACE"; the full tagline
  is not set anywhere on the site.

## Adding a property

Copy one `<a class="card">` block inside `#rail` in `index.html`. The rail scrolls
horizontally and snaps, so any number of cards works without a layout change. Add the image
to `img/`, set `width`/`height` on the `<img>`, and set `--sk` on the wrapping `.ph` to the
image's dominant colour — that's the skeleton tone shown while it loads.

Give the card `data-property` and `data-detail` attributes — clicking it drops a matching
line into the contact form's message field and scrolls the visitor there.

Then add the property to the tables in `llms.txt` and `llms-full.txt`.

## Accessibility and performance

- Skip link, visible focus rings, labelled controls, `aria-live` form status
- Full keyboard support: left/right arrow keys advance the hero carousel, the indicator
  dots are tabbable buttons, Escape closes the mobile menu, the property rail is focusable
- `prefers-reduced-motion` disables the carousel autoplay, shimmer and scroll animation
- Every image carries intrinsic `width`/`height`, so there is no layout shift
- Images are WebP; the whole page including photography is roughly 900 KB
- Works without JavaScript — a `<noscript>` block reveals all images, the first hero frame
  and the full biographies
