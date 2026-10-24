const PAGE = "__SITE_HTML__";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const MAX_BODY_BYTES = 12_000;
const ASSISTANCE_TYPES = new Set([
  "Gaming Computer",
  "Laptop",
  "Game Console",
  "Network Switch",
  "Video Surveillance Camera",
  "Cell-Phone",
]);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim();
  return cleaned.length <= maxLength && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cleaned)
    ? cleaned
    : "";
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export async function handleContact(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return jsonResponse({ ok: false, message: "Request could not be verified." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonResponse({ ok: false, message: "Send the form as JSON." }, 415);
  }

  const announcedLength = Number(request.headers.get("content-length") || 0);
  if (announcedLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, message: "The message is too large." }, 413);
  }

  let rawBody;
  let form;
  try {
    rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, message: "The message is too large." }, 413);
    }
    form = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, message: "The form data could not be read." }, 400);
  }
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    return jsonResponse({ ok: false, message: "The form data could not be read." }, 400);
  }

  // Quietly accept bot submissions without sending them.
  if (cleanString(form.website, 200)) return jsonResponse({ ok: true });

  const name = cleanString(form.name, 100);
  const assistance = cleanString(form.assistance, 100);
  const email = cleanString(form.email, 254).toLowerCase();
  const phone = cleanString(form.phone, 40);
  const message = cleanString(form.message, 5_000);

  if (form.confirmed !== true) {
    return jsonResponse({ ok: false, message: "Please confirm before sending." }, 400);
  }
  if (!name || /[\r\n]/.test(name)) {
    return jsonResponse({ ok: false, message: "Please enter your name." }, 400);
  }
  if (!ASSISTANCE_TYPES.has(assistance)) {
    return jsonResponse({ ok: false, message: "Please choose the type of assistance you need." }, 400);
  }
  if (email && !isValidEmail(email)) {
    return jsonResponse({ ok: false, message: "Please enter a valid email address." }, 400);
  }
  if (phone && !isValidPhone(phone)) {
    return jsonResponse({ ok: false, message: "Please enter a valid phone number." }, 400);
  }
  if (!email && !phone) {
    return jsonResponse({ ok: false, message: "Please provide an email address or phone number." }, 400);
  }
  if (!message || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
    return jsonResponse({ ok: false, message: "Please enter a message." }, 400);
  }

  const apiKey = env.RE_API_KEY;
  const recipient = env.CONTACT_TO_EMAIL;
  if (!apiKey || !recipient) {
    const missingBindings = [
      !apiKey && "RE_API_KEY",
      !recipient && "CONTACT_TO_EMAIL",
    ].filter(Boolean);
    console.error("Contact form is missing runtime bindings:", missingBindings.join(", "));
    return jsonResponse({ ok: false, message: "The contact form is temporarily unavailable." }, 503);
  }

  const emailBody = [
    `Name: ${name}`,
    `Type of assistance: ${assistance}`,
    `Email: ${email || "Not provided"}`,
    `Phone: ${phone || "Not provided"}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const resendPayload = {
    from: "Shepherd IT Contact <website@salsbury.org>",
    to: [recipient],
    subject: `Website inquiry from ${name}`,
    text: emailBody,
    ...(email ? { reply_to: email } : {}),
  };

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      console.error("Resend rejected a contact form message with status", resendResponse.status);
      return jsonResponse({ ok: false, message: "We could not send your message. Please try again later." }, 502);
    }
  } catch {
    console.error("Resend could not be reached for a contact form message.");
    return jsonResponse({ ok: false, message: "We could not send your message. Please try again later." }, 502);
  }

  return jsonResponse({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
      return new Response(request.method === "HEAD" ? null : PAGE, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" },
    });
  },
};
