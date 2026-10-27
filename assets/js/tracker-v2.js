(() => {
  "use strict";

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

  const params = new URLSearchParams(window.location.search);

  function cleanControlParam(name) {
    if (!params.has(name)) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  // Owner mode: visit once with ?owner=1 from your own browser.
  // To re-enable tracking on that browser, visit once with ?owner=0.
  if (params.get("owner") === "1") {
    localStorage.setItem(STORAGE.owner, "1");
    cleanControlParam("owner");
  } else if (params.get("owner") === "0") {
    localStorage.removeItem(STORAGE.owner);
    cleanControlParam("owner");
  }

  // Visitor opt-out: ?no_track=1. Re-enable with ?track=1.
  if (params.get("no_track") === "1") {
    localStorage.setItem(STORAGE.optOut, "1");
    cleanControlParam("no_track");
  } else if (params.get("track") === "1") {
    localStorage.removeItem(STORAGE.optOut);
    cleanControlParam("track");
  }

  const endpointReady =
    TRACKING_ENDPOINT.startsWith("https://") &&
    !TRACKING_ENDPOINT.includes("https://malfalah.vercel.app/api/track");

  if (!endpointReady) {
    console.info("[Portfolio Tracker] Endpoint not configured yet.");
    return;
  }

  const doNotTrack =
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    navigator.msDoNotTrack === "1";

  if (
    localStorage.getItem(STORAGE.owner) === "1" ||
    localStorage.getItem(STORAGE.optOut) === "1" ||
    doNotTrack ||
    navigator.webdriver
  ) {
    return;
  }

  function randomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  let sessionId = sessionStorage.getItem(STORAGE.session);
  if (!sessionId) {
    sessionId = randomId();
    sessionStorage.setItem(STORAGE.session, sessionId);
  }

  if (params.get("ref")) {
    sessionStorage.setItem(STORAGE.ref, params.get("ref").slice(0, 80));
  }
  if (params.get("utm_source")) {
    sessionStorage.setItem(
      STORAGE.utmSource,
      params.get("utm_source").slice(0, 80),
    );
  }
  if (params.get("utm_campaign")) {
    sessionStorage.setItem(
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
    pages = JSON.parse(sessionStorage.getItem(STORAGE.pages) || "[]");
    if (!Array.isArray(pages)) pages = [];
  } catch {
    pages = [];
  }

  const currentPage = prettyPage(pageName);
  if (!pages.includes(currentPage)) {
    pages.push(currentPage);
    pages = pages.slice(-8);
    sessionStorage.setItem(STORAGE.pages, JSON.stringify(pages));
  }

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
      referral: sessionStorage.getItem(STORAGE.ref) || "",
      utmSource: sessionStorage.getItem(STORAGE.utmSource) || "",
      utmCampaign: sessionStorage.getItem(STORAGE.utmCampaign) || "",
      referrer: referrerHost(),
      pages,
      device: deviceType(),
      language: navigator.language || "",
      timestamp: new Date().toISOString(),
      ...extra,
    };
  }

  function send(event, extra = {}) {
    const payload = JSON.stringify(buildPayload(event, extra));

    // text/plain keeps the request CORS-simple and avoids exposing any secret.
    try {
      fetch(TRACKING_ENDPOINT, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        keepalive: true,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: payload,
      }).catch(() => {});
    } catch {
      // Tracking must never interfere with the portfolio UX.
    }
  }

  if (sessionStorage.getItem(STORAGE.visitSent) !== "1") {
    sessionStorage.setItem(STORAGE.visitSent, "1");
    send("visit");
  }

  function maybeSendEngaged(reason) {
    if (sessionStorage.getItem(STORAGE.engagedSent) === "1") return;

    if (pages.length >= 3 || reason === "time") {
      sessionStorage.setItem(STORAGE.engagedSent, "1");
      send("engaged", { engagementReason: reason });
    }
  }

  maybeSendEngaged("pages");

  // One "engaged visitor" signal if someone stays actively on the site.
  window.setTimeout(() => {
    if (document.visibilityState === "visible") {
      maybeSendEngaged("time");
    }
  }, 90_000);

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
