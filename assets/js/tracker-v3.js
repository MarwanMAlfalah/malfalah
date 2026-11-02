(() => {
  "use strict";

  if (window.__malfalahTrackerV3Initialized) return;
  window.__malfalahTrackerV3Initialized = true;

  // Replace this after your Vercel deployment.
  const TRACKING_ENDPOINT = "https://malfalah.vercel.app/api/track";

  const STORAGE = {
    owner: "ma_portfolio_owner_v1",
    optOut: "ma_portfolio_tracking_opt_out_v1",
    session: "ma_portfolio_session_v1",
    visitSent: "ma_portfolio_visit_sent_v1",
    engagedSent: "ma_portfolio_engaged_sent_v1",
    pages: "ma_portfolio_pages_v1",
    ref: "ma_portfolio_ref_v1",
    utmSource: "ma_portfolio_utm_source_v1",
    utmCampaign: "ma_portfolio_utm_campaign_v1",
  };

  // Keep page-local state even when storage is blocked or a write fails.
  function safeStorage(name) {
    const memory = new Map();
    return {
      get(key) {
        if (memory.has(key)) return memory.get(key);
        try {
          return window[name].getItem(key);
        } catch {
          return null;
        }
      },
      set(key, value) {
        memory.set(key, value);
        try {
          window[name].setItem(key, value);
        } catch {}
      },
      remove(key) {
        memory.set(key, null);
        try {
          window[name].removeItem(key);
        } catch {}
      },
    };
  }

  const local = safeStorage("localStorage");
  const session = safeStorage("sessionStorage");
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return;
  }

  function cleanControlParam(name) {
    if (!params.has(name)) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(name);
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch {}
  }

  // Owner mode: visit once with ?owner=1 from your own browser.
  // To re-enable tracking on that browser, visit once with ?owner=0.
  if (params.get("owner") === "1") {
    local.set(STORAGE.owner, "1");
    cleanControlParam("owner");
  } else if (params.get("owner") === "0") {
    local.remove(STORAGE.owner);
    cleanControlParam("owner");
  }

  // Visitor opt-out: ?no_track=1. Re-enable with ?track=1.
  if (params.get("no_track") === "1") {
    local.set(STORAGE.optOut, "1");
    cleanControlParam("no_track");
  } else if (params.get("track") === "1") {
    local.remove(STORAGE.optOut);
    cleanControlParam("track");
  }

  const endpointReady = TRACKING_ENDPOINT.startsWith("https://");

  if (!endpointReady) {
    console.info("[Portfolio Tracker] Endpoint not configured yet.");
    return;
  }

  const doNotTrack =
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    navigator.msDoNotTrack === "1";

  if (
    local.get(STORAGE.owner) === "1" ||
    local.get(STORAGE.optOut) === "1" ||
    doNotTrack ||
    navigator.webdriver
  ) {
    return;
  }

  function randomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  let sessionId = session.get(STORAGE.session);
  if (!sessionId) {
    sessionId = randomId();
    session.set(STORAGE.session, sessionId);
  }

  if (params.get("ref")) {
    session.set(STORAGE.ref, params.get("ref").slice(0, 80));
  }
  if (params.get("utm_source")) {
    session.set(
      STORAGE.utmSource,
      params.get("utm_source").slice(0, 80),
    );
  }
  if (params.get("utm_campaign")) {
    session.set(
      STORAGE.utmCampaign,
      params.get("utm_campaign").slice(0, 80),
    );
  }

  const pageName =
    document.body?.dataset?.page ||
    window.location.pathname.split("/").filter(Boolean).pop()?.replace(".html", "") ||
    "about";

  function prettyPage(value) {
    const names = {
      about: "About",
      index: "About",
      research: "Research",
      publications: "Publications",
      projects: "Projects",
      experience: "Experience",
      contact: "Contact",
      cv: "CV",
    };
    return names[value] || value || "Unknown";
  }

  let pages = [];
  try {
    pages = JSON.parse(session.get(STORAGE.pages) || "[]");
    if (!Array.isArray(pages)) pages = [];
  } catch {
    pages = [];
  }

  const currentPage = prettyPage(pageName);
  if (!pages.includes(currentPage)) {
    pages.push(currentPage);
    pages = pages.slice(-8);
    session.set(STORAGE.pages, JSON.stringify(pages));
  }

  const contentPages = new Set([
    "About",
    "Research",
    "Publications",
    "Projects",
    "Experience",
    "Contact",
  ]);
  const contentPageCount = new Set(pages.filter((name) => contentPages.has(name))).size;

  function referrerHost() {
    if (!document.referrer) return "Direct / unknown";
    try {
      return new URL(document.referrer).hostname || "Direct / unknown";
    } catch {
      return "Unknown";
    }
  }

  function deviceType() {
    const ua = navigator.userAgent || "";
    if (/ipad|tablet/i.test(ua)) return "Tablet";
    if (/mobi|android|iphone/i.test(ua)) return "Mobile";
    return "Desktop";
  }

  function buildPayload(event, extra = {}) {
    return {
      event,
      sessionId,
      page: currentPage,
      path: window.location.pathname,
      referral: session.get(STORAGE.ref) || "",
      utmSource: session.get(STORAGE.utmSource) || "",
      utmCampaign: session.get(STORAGE.utmCampaign) || "",
      referrer: referrerHost(),
      pages,
      device: deviceType(),
      language: navigator.language || "",
      timestamp: new Date().toISOString(),
      ...extra,
    };
  }

  async function send(event, extra = {}) {
    // text/plain keeps the request CORS-simple and avoids exposing any secret.
    try {
      const response = await fetch(TRACKING_ENDPOINT, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        keepalive: true,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify(buildPayload(event, extra)),
      });
      return response.ok ? "success" : "http_error";
    } catch {
      // Tracking must never interfere with the portfolio UX.
      return "network_error";
    }
  }

  const pendingEvents = new Set();
  async function sendSessionEvent(event, flag, extra = {}) {
    if (session.get(flag) === "1" || pendingEvents.has(flag)) return false;
    pendingEvents.add(flag);
    try {
      if ((await send(event, extra)) !== "success") return false;
      session.set(flag, "1");
      return true;
    } finally {
      pendingEvents.delete(flag);
    }
  }

  void sendSessionEvent("visit", STORAGE.visitSent);

  async function maybeSendEngaged(reason) {
    if (contentPageCount >= 3 || reason === "time") {
      const delivered = await sendSessionEvent("engaged", STORAGE.engagedSent, {
        engagementReason: reason,
      });
      if (delivered) stopEngagementTiming();
    }
  }

  let visibleTime = 0;
  let visibleSince = null;
  let engagementTimer = null;
  let timeAttempted = false;

  function stopEngagementTiming() {
    if (engagementTimer !== null) window.clearTimeout(engagementTimer);
    engagementTimer = null;
    visibleSince = null;
    document.removeEventListener("visibilitychange", updateEngagementTiming);
  }

  function updateEngagementTiming() {
    if (engagementTimer !== null) window.clearTimeout(engagementTimer);
    engagementTimer = null;
    const now = Date.now();
    if (visibleSince !== null) {
      visibleTime += Math.max(0, now - visibleSince);
      visibleSince = null;
    }
    if (session.get(STORAGE.engagedSent) === "1") {
      stopEngagementTiming();
      return;
    }
    if (document.visibilityState !== "visible" || timeAttempted) return;
    if (visibleTime >= 90_000) {
      // No retry loop: failed delivery may be retried by a later page load.
      timeAttempted = true;
      void maybeSendEngaged("time");
      return;
    }
    visibleSince = now;
    engagementTimer = window.setTimeout(updateEngagementTiming, 90_000 - visibleTime);
  }

  if (session.get(STORAGE.engagedSent) !== "1") {
    document.addEventListener("visibilitychange", updateEngagementTiming);
    updateEngagementTiming();
    void maybeSendEngaged("pages");
  }

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;

      const rawHref = link.getAttribute("href") || "";
      const absoluteHref = link.href || rawHref;
      let eventName = "";

      if (/Marwan_AlFalah_CV\.pdf/i.test(absoluteHref)) {
        eventName = "cv_open";
      } else if (/^mailto:/i.test(rawHref)) {
        eventName = "email_click";
      } else if (/scholar\.google\./i.test(absoluteHref)) {
        eventName = "scholar_click";
      } else if (/linkedin\.com/i.test(absoluteHref)) {
        eventName = "linkedin_click";
      } else if (/github\.com\/MarwanMAlfalah/i.test(absoluteHref)) {
        eventName = "github_click";
      }

      if (eventName) {
        send(eventName, {
          target: absoluteHref.slice(0, 240),
        });
      }
    },
    { capture: true },
  );
})();
