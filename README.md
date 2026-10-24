# Shepherd IT

A simple, responsive business card website for home and small-business technology support in Henderson and the surrounding Las Vegas area.

## Run locally

Requires Node.js 22 or newer. No install step is needed.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). The page follows the visitor's system light or dark preference. The contact endpoint uses the same Worker implementation locally.

For local email delivery, copy `.env.example` to `.env` and set `RE_API_KEY`, `CONTACT_TO_EMAIL`, and a Resend-verified `RE_FROM_EMAIL`. Never commit `.env`.

## Build the Site Worker

```sh
npm run build
npm run validate
```

The Worker reads `RE_API_KEY`, `CONTACT_TO_EMAIL`, and `RE_FROM_EMAIL` from runtime bindings. Configure these in the hosted Site environment; mark the API key and recipient as secrets, and use a sender address verified in Resend.

## Update before launch

Confirm the business name and exact service list in `public/index.html` before sharing the site with customers.
