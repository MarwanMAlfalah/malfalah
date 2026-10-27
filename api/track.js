const ALLOWED_EVENTS = new Set([
  "visit",
  "engaged",
  "cv_open",
  "email_click",
  "scholar_click",
  "github_click",
  "linkedin_click",
]);

const EVENT_META = {
  visit: ["🟢", "New portfolio visitor"],
  engaged: ["👀", "Engaged portfolio visitor"],
  cv_open: ["🔥", "CV opened"],
  email_click: ["📨", "Email link clicked"],
  scholar_click: ["🎓", "Google Scholar opened"],
  github_click: ["💻", "GitHub opened"],
  linkedin_click: ["🔗", "LinkedIn opened"],
};

function text(value, max = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, max);
}

function escapeHtml(value) {
  return text(value, 700)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

function isLikelyBot(userAgent) {
  return /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pagespeed|curl|wget/i.test(
    userAgent || "",
  );
}

function formatMoscowTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(new Date());
}

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || "https://marwanmalfalah.github.io")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function setCors(req, res) {
  const origin = text(req.headers.origin, 220);
  const allowed = allowedOrigins();

  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function eventMessage(data, req) {
  const event = text(data.event, 40);
  const [emoji, label] = EVENT_META[event] || ["🔔", "Portfolio event"];

  const country =
    text(req.headers["x-vercel-ip-country"], 8) || "Unknown";
  const page = text(data.page, 80) || "Unknown";
  const referral = text(data.referral, 100);
  const utmSource = text(data.utmSource, 100);
  const utmCampaign = text(data.utmCampaign, 100);
  const referrer = text(data.referrer, 160) || "Direct / unknown";
  const device = text(data.device, 40) || "Unknown";
  const language = text(data.language, 30) || "Unknown";
  const session = text(data.sessionId, 80).slice(0, 8);
  const reason = text(data.engagementReason, 30);

  const rawPages = Array.isArray(data.pages) ? data.pages.slice(0, 8) : [];
  const journey = rawPages.map((p) => text(p, 50)).filter(Boolean).join(" → ");

  let source = referral;
  if (!source && utmCampaign) source = utmCampaign;
  if (!source && utmSource) source = utmSource;
  if (!source) source = "Unlabeled";

  const lines = [
    `${emoji} <b>${escapeHtml(label)}</b>`,
    "",
    `📄 <b>Page:</b> ${escapeHtml(page)}`,
    `🏷 <b>Source:</b> ${escapeHtml(source)}`,
    `🌐 <b>Referrer:</b> ${escapeHtml(referrer)}`,
    `🌍 <b>Country:</b> ${escapeHtml(country)}`,
    `🖥 <b>Device:</b> ${escapeHtml(device)}`,
    `🗣 <b>Language:</b> ${escapeHtml(language)}`,
  ];

  if (journey) {
    lines.push(`🧭 <b>Journey:</b> ${escapeHtml(journey)}`);
  }

  if (event === "engaged" && reason) {
    lines.push(
      `⏱ <b>Engagement:</b> ${
        reason === "time" ? "90+ seconds on site" : "3+ unique pages"
      }`,
    );
  }

  if (data.target && event !== "visit") {
    lines.push(`🎯 <b>Target:</b> ${escapeHtml(text(data.target, 240))}`);
  }

  lines.push(`🕒 <b>Moscow time:</b> ${escapeHtml(formatMoscowTime())}`);
  if (session) lines.push(`🔑 <b>Session:</b> ${escapeHtml(session)}`);

  return lines.join("\n");
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false });
  }

  const origin = text(req.headers.origin, 220);
  if (!origin || !allowedOrigins().includes(origin)) {
    return res.status(403).json({ ok: false });
  }

  const userAgent = text(req.headers["user-agent"], 400);
  if (isLikelyBot(userAgent)) {
    return res.status(204).end();
  }

  const data = parseBody(req);
  if (!data || !ALLOWED_EVENTS.has(text(data.event, 40))) {
    return res.status(400).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = process.env.TELEGRAM_MESSAGE_THREAD_ID;

  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
    return res.status(503).json({ ok: false, configured: false });
  }

  const telegramPayload = {
    chat_id: chatId,
    text: eventMessage(data, req),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (threadId) {
    telegramPayload.message_thread_id = Number(threadId);
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telegramPayload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Telegram sendMessage failed:", response.status, errorText);
      return res.status(502).json({ ok: false });
    }

    return res.status(204).end();
  } catch (error) {
    console.error("Telegram request failed:", error);
    return res.status(502).json({ ok: false });
  }
};
