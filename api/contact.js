/**
 * POST /api/contact  —  contact form → Resend
 *
 * Required env vars (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY   re_xxxxxxxx
 *   CONTACT_TO       info@newoptionpartners.com        (comma-separate for several)
 *   CONTACT_FROM     NewOption Website <website@mail.newoptionpartners.com>
 *                    ^ must be on a domain verified in Resend
 * Optional:
 *   CONTACT_BCC      paul@... ,aaron@...
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const MAX = { first: 100, last: 100, email: 200, phone: 60, message: 5000 };

// naive per-instance rate limit — deters casual abuse, not a substitute for a WAF
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

const clean = (v, max) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;
  if (!key || !to || !from) {
    console.error('contact: missing RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res
      .status(500)
      .json({ error: 'The contact form is not configured yet.' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ error: 'Too many messages just now. Please try again in a minute.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // honeypot: real people never fill this in
  if (clean(body.company_website, 200)) {
    return res.status(200).json({ ok: true });
  }

  const first = clean(body.first, MAX.first);
  const last = clean(body.last, MAX.last);
  const email = clean(body.email, MAX.email);
  const phone = clean(body.phone, MAX.phone);
  const message =
    typeof body.message === 'string' ? body.message.trim().slice(0, MAX.message) : '';

  if (!first) return res.status(400).json({ error: 'Please include your first name.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please include a valid email address.' });

  const name = [first, last].filter(Boolean).join(' ');
  const subjectName = name.replace(/[<>]/g, '').slice(0, 120) || 'website visitor';
  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || '—'],
  ];

  const html = `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0E1D26;max-width:600px">
  <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#B08240;margin:0 0 6px">
    newoptionpartners.com
  </p>
  <h2 style="margin:0 0 20px;font-size:21px">New enquiry from ${esc(name)}</h2>
  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:15px">
    ${rows
      .map(
        ([k, v]) => `<tr>
      <td style="padding:9px 0;border-bottom:1px solid #E1DDD5;color:#5F6E77;width:110px">${k}</td>
      <td style="padding:9px 0;border-bottom:1px solid #E1DDD5">${esc(v)}</td>
    </tr>`
      )
      .join('')}
  </table>
  ${
    message
      ? `<p style="margin:24px 0 8px;color:#5F6E77;font-size:13px">Message</p>
         <div style="white-space:pre-wrap;line-height:1.65;font-size:15px;border-left:2px solid #B08240;padding-left:16px">${esc(
           message
         )}</div>`
      : `<p style="margin:24px 0 0;color:#5F6E77;font-size:14px">No message was included.</p>`
  }
  <p style="margin:28px 0 0;font-size:12px;color:#8A959B">
    Reply directly to this email to answer ${esc(first)}.
  </p>
</div>`.trim();

  const text = [
    `New enquiry from ${name}`,
    '',
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    '',
    message || '(no message)',
  ].join('\n');

  try {
    const r = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        ...(process.env.CONTACT_BCC
          ? { bcc: process.env.CONTACT_BCC.split(',').map((s) => s.trim()).filter(Boolean) }
          : {}),
        reply_to: email,
        subject: `Website enquiry — ${subjectName}`,
        html,
        text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('resend error', r.status, detail);
      return res.status(502).json({
        error: 'We could not send that just now. Please try again or call us.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact handler', err);
    return res.status(502).json({
      error: 'We could not send that just now. Please try again or call us.',
    });
  }
}
