# Shepherd IT

A simple, responsive business card website for home and small-business technology support in Henderson and the surrounding Las Vegas area.

## Run locally

Requires Node.js 22 or newer. No install step is needed.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page follows the visitor's system light or dark preference. The contact endpoint uses the same Worker implementation locally.

For local email delivery, copy `.env.example` to `.env` and set `RE_API_KEY` and `CONTACT_TO_EMAIL`. Never commit `.env`.

## Cloudflare Worker

`wrangler.jsonc` configures the `shepherdit-business-card` Worker to serve files from `public/`, run the Worker for `/api/*`, and route `salsbury.org/api/*` to it.

The Worker reads `RE_API_KEY` and `CONTACT_TO_EMAIL` from runtime bindings. Set both on the `shepherdit-business-card` Worker as secrets. It sends from the generic `website@salsbury.org` address, which must belong to a domain verified in Resend. A visitor's email is used as `reply_to` when provided.

## Update before launch

Confirm the business name and exact service list in `public/index.html` before sharing the site with customers.
