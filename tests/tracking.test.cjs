// Run with: node --test tests/tracking.test.cjs
// Every storage, clock and network operation is mocked; no live events are sent.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const tracker = fs.readFileSync(path.join(root, "assets/js/tracker-v3.js"), "utf8");
const backend = fs.readFileSync(path.join(root, "api/track.js"), "utf8");
const origin = "https://marwanmalfalah.github.io";
const base = `${origin}/malfalah/`;
const key = (name) => `ma_portfolio_${name}_v1`;
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

function storage(values, failures = []) {
  return Object.fromEntries([
    ["getItem", (name) => values.get(name) ?? null],
    ["setItem", (name, value) => values.set(name, String(value))],
    ["removeItem", (name) => values.delete(name)],
  ].map(([operation, fn]) => [operation, (...args) => {
    if (failures.includes(operation)) throw new Error("Storage unavailable");
    return fn(...args);
  }]));
}

function browser(options = {}) {
  let now = 0;
  let timerId = 0;
  let location = new URL(options.url || base);
  const local = options.local || new Map();
  const session = options.session || new Map();
  const timers = new Map();
  const listeners = new Map();
  const requests = [];
  const outcomes = [...(options.outcomes || [])];
  const document = {
    body: { dataset: { page: options.page || "about" } },
    visibilityState: options.visibility || "visible",
    referrer: options.referrer || "",
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
  };
  const window = {
    get location() { return location; },
    history: { replaceState: (_, __, url) => {
      if (options.historyFails) throw new Error("History unavailable");
      location = new URL(url, location);
    } },
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000000" },
    setTimeout: (fn, delay) => {
      timers.set(++timerId, { fn, at: now + delay });
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
    doNotTrack: options.windowDnt,
  };
  for (const [name, values, failures] of [
    ["localStorage", local, options.localFailures],
    ["sessionStorage", session, options.sessionFailures],
  ]) {
    Object.defineProperty(window, name, { get() {
      if (options[`${name}Unavailable`]) throw new Error("Storage access denied");
      return storage(values, failures);
    } });
  }
  const context = vm.createContext({
    window, document, URL, URLSearchParams,
    Date: class extends Date { static now() { return now; } },
    navigator: {
      doNotTrack: options.dnt, msDoNotTrack: options.msDnt,
      webdriver: options.webdriver, language: "en-US", userAgent: "TestBrowser/1.0",
    },
    console: { info() {} },
    fetch(url, config) {
      requests.push({ url, config, payload: JSON.parse(config.body) });
      const outcome = outcomes.shift() ?? 204;
      if (outcome === "throw") throw new Error("Network unavailable");
      if (outcome instanceof Error) return Promise.reject(outcome);
      if (typeof outcome === "function") return outcome();
      return Promise.resolve({ ok: outcome >= 200 && outcome < 300, status: outcome });
    },
  });
  const evaluate = () => vm.runInContext(tracker, context);
  evaluate();
  return {
    local, session, timers, listeners, requests, document, evaluate,
    events: () => requests.map(({ payload }) => payload.event),
    get location() { return location; },
    async tick(ms) {
      const until = now + ms;
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > until) break;
        assert.ok(next[1].at >= now, "timer must move forwards");
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
        await flush();
      }
      now = until;
      await flush();
    },
    visibility(value) {
      document.visibilityState = value;
      for (const fn of listeners.get("visibilitychange") || []) fn();
    },
    click(href) {
      const link = { href: new URL(href, location).href, getAttribute: () => href };
      for (const fn of listeners.get("click") || []) {
        fn({ target: { closest: () => link }, preventDefault() {
          assert.fail("Tracking must not block navigation");
        } });
      }
    },
  };
}

const normalPayload = () => ({
  event: "visit", sessionId: "00000000-0000-4000-8000-000000000000",
  page: "About", path: "/malfalah/", referral: "", utmSource: "", utmCampaign: "",
  referrer: "Direct / unknown", pages: ["About"], device: "Desktop",
  language: "en-US", timestamp: "2026-11-02T00:00:00.000Z",
});

async function api(options = {}) {
  const requests = [];
  const context = {
    Buffer, module: { exports: {} },
    process: { env: {
      TELEGRAM_BOT_TOKEN: "MOCK_NOT_A_REAL_TOKEN", TELEGRAM_CHAT_ID: "MOCK_CHAT",
      ...(options.env || {}),
    } },
    console: { error() {} },
    fetch: async (url, config) => {
      requests.push({ url, body: JSON.parse(config.body) });
      if (options.networkFails) throw new Error("Mock network failure");
      return { ok: options.telegramOk !== false, status: 500, text: async () => "Mock error" };
    },
  };
  vm.runInNewContext(backend, context);
  const req = {
    method: options.method || "POST",
    headers: { origin, "user-agent": "TestBrowser/1.0", ...(options.headers || {}) },
    body: options.body === undefined ? JSON.stringify(normalPayload()) : options.body,
  };
  const res = {
    headers: {}, setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, end() { return this; },
  };
  await context.module.exports(req, res);
  return { res, requests };
}

test("storage access failures do not abort initialization or clicks", async () => {
  for (const name of ["localStorageUnavailable", "sessionStorageUnavailable"]) {
    const b = browser({ [name]: true, url: `${base}?ref=Prof%20A&utm_source=email&utm_campaign=phd` });
    await flush();
    b.click("mailto:test@example.invalid");
    assert.deepEqual(b.events(), ["visit", "email_click"]);
    assert.equal(b.requests[1].payload.referral, "Prof A");
    assert.equal(b.requests[1].payload.utmSource, "email");
    assert.equal(b.requests[1].payload.utmCampaign, "phd");
  }
});

test("storage method failures retain successful delivery and attribution in memory", async () => {
  const b = browser({ localFailures: ["getItem", "setItem", "removeItem"], sessionFailures: ["getItem", "setItem", "removeItem"], url: `${base}?ref=prof` });
  await flush();
  await b.tick(90000);
  b.visibility("hidden"); b.visibility("visible");
  await b.tick(90000);
  b.click("mailto:test@example.invalid");
  assert.deepEqual(b.events(), ["visit", "engaged", "email_click"]);
  assert.equal(b.requests.at(-1).payload.referral, "prof");
});

test("owner=1 and no_track=1 suppress even when storage and history fail", () => {
  for (const control of ["owner=1", "no_track=1", "no_track=1&track=1"]) {
    const b = browser({ localStorageUnavailable: true, historyFails: true, url: `${base}?${control}` });
    assert.deepEqual(b.events(), []);
    assert.equal(b.listeners.size, 0);
    assert.equal(b.timers.size, 0);
  }
});

test("owner=0 and track=1 override stale stored flags even if removal fails", () => {
  for (const [control, storedKey] of [["owner=0", key("owner")], ["track=1", "ma_portfolio_tracking_opt_out_v1"]]) {
    const b = browser({ url: `${base}?${control}`, local: new Map([[storedKey, "1"]]), localFailures: ["removeItem"] });
    assert.deepEqual(b.events(), ["visit"]);
  }
});

test("owner mode persists, owner=0 clears it, and unrelated URL data survives", () => {
  const local = new Map();
  const b = browser({ local, url: `${base}?owner=1&ref=Prof%20A&utm_source=email#research` });
  assert.deepEqual(b.events(), []);
  assert.equal(local.get(key("owner")), "1");
  assert.deepEqual([...b.location.searchParams], [["ref", "Prof A"], ["utm_source", "email"]]);
  assert.equal(b.location.hash, "#research");
  assert.deepEqual(browser({ local }).events(), []);
  assert.deepEqual(browser({ local, url: `${base}?owner=0` }).events(), ["visit"]);
  assert.equal(local.has(key("owner")), false);
});

test("no_track wins; track cannot override owner, DNT variants or webdriver", () => {
  const optOut = "ma_portfolio_tracking_opt_out_v1";
  const local = new Map();
  const b = browser({ local, url: `${base}?no_track=1&track=1` });
  assert.deepEqual(b.events(), []);
  assert.equal(local.get(optOut), "1");
  assert.equal(b.location.search, "?track=1");
  assert.deepEqual(browser({ local, url: `${base}?track=1` }).events(), ["visit"]);
  for (const extra of [{ local: new Map([[key("owner"), "1"]]) }, { dnt: "1" }, { windowDnt: "1" }, { msDnt: "1" }, { webdriver: true }]) {
    assert.deepEqual(browser({ ...extra, url: `${base}?track=1` }).events(), []);
  }
});

test("visit is persisted only after an accepted response, then suppressed on navigation", async () => {
  let accept;
  const b = browser({ outcomes: [() => new Promise((resolve) => { accept = resolve; })] });
  assert.equal(b.session.get(key("visit_sent")), undefined);
  b.evaluate();
  assert.deepEqual(b.events(), ["visit"]);
  accept({ ok: true, status: 204 });
  await flush();
  assert.equal(b.session.get(key("visit_sent")), "1");
  assert.deepEqual(browser({ session: b.session, page: "research" }).events(), []);
});

for (const outcome of [400, 500, new Error("Offline"), "throw"]) {
  test(`failed visit (${typeof outcome === "number" ? outcome : "network"}) leaves the flag unset for later navigation`, async () => {
    const b = browser({ outcomes: [outcome] });
    await flush();
    assert.equal(b.session.get(key("visit_sent")), undefined);
    assert.deepEqual(b.events(), ["visit"]);
    const next = browser({ session: b.session, page: "research" });
    await flush();
    assert.deepEqual(next.events(), ["visit"]);
    assert.equal(next.session.get(key("visit_sent")), "1");
  });
}

test("90 seconds visible emits engagement once and removes timing work", async () => {
  const b = browser();
  await b.tick(89999);
  assert.deepEqual(b.events(), ["visit"]);
  await b.tick(1);
  assert.deepEqual(b.events(), ["visit", "engaged"]);
  assert.equal(b.session.get(key("engaged_sent")), "1");
  assert.equal(b.requests[1].payload.engagementReason, "time");
  assert.equal(b.timers.size, 0);
  assert.equal(b.listeners.get("visibilitychange").size, 0);
  await b.tick(180000);
  assert.equal(b.events().length, 2);
});

test("hidden time is excluded and remaining visible time resumes", async () => {
  const b = browser();
  await b.tick(30000);
  b.visibility("hidden");
  assert.equal(b.timers.size, 0);
  await b.tick(300000);
  assert.deepEqual(b.events(), ["visit"]);
  b.visibility("visible");
  await b.tick(59999);
  assert.deepEqual(b.events(), ["visit"]);
  await b.tick(1);
  assert.deepEqual(b.events(), ["visit", "engaged"]);
});

test("initially hidden pages start timing only after becoming visible", async () => {
  const b = browser({ visibility: "hidden" });
  await b.tick(300000);
  assert.equal(b.timers.size, 0);
  b.visibility("visible");
  await b.tick(90000);
  assert.deepEqual(b.events(), ["visit", "engaged"]);
});

test("successful session engagement disables timers and visibility listeners on later pages", async () => {
  const session = new Map([[key("visit_sent"), "1"], [key("engaged_sent"), "1"]]);
  const b = browser({ session, page: "research" });
  assert.equal(b.timers.size, 0);
  assert.equal(b.listeners.has("visibilitychange"), false);
  await b.tick(90000);
  assert.deepEqual(b.events(), []);
  b.click("assets/files/Marwan_AlFalah_CV.pdf");
  assert.deepEqual(b.events(), ["cv_open"]);
});

test("failed engagement has no successful flag and no automatic retry loop", async () => {
  const b = browser({ outcomes: [204, 500] });
  await b.tick(90000);
  assert.equal(b.session.get(key("engaged_sent")), undefined);
  b.visibility("hidden"); b.visibility("visible");
  await b.tick(900000);
  assert.deepEqual(b.events(), ["visit", "engaged"]);
  const next = browser({ session: b.session });
  await next.tick(90000);
  assert.deepEqual(next.events(), ["engaged"]);
  assert.equal(next.session.get(key("engaged_sent")), "1");
});

test("in-flight page engagement cannot duplicate when time threshold is reached", async () => {
  let accept;
  const session = new Map([[key("visit_sent"), "1"], [key("pages"), '["About","Research"]']]);
  const b = browser({ session, page: "contact", outcomes: [() => new Promise((resolve) => { accept = resolve; })] });
  await b.tick(90000);
  assert.deepEqual(b.events(), ["engaged"]);
  assert.equal(session.get(key("engaged_sent")), undefined);
  accept({ ok: true, status: 204 });
  await flush();
  assert.equal(session.get(key("engaged_sent")), "1");
  assert.equal(b.listeners.get("visibilitychange").size, 0);
});

test("404 and unknown labels never contribute to three-page engagement", async () => {
  const session = new Map([[key("visit_sent"), "1"]]);
  for (const page of ["about", "404", "unknown", "research"]) {
    const b = browser({ session, page });
    await flush();
    assert.deepEqual(b.events(), []);
  }
  const b = browser({ session, page: "contact", visibility: "hidden" });
  await flush();
  assert.deepEqual(b.events(), ["engaged"]);
  assert.equal(b.requests[0].payload.engagementReason, "pages");
  assert.ok(b.requests[0].payload.pages.includes("404"));
  assert.equal(b.timers.size, 0);
});

test("reloads do not count as additional content pages", async () => {
  const session = new Map([[key("visit_sent"), "1"]]);
  for (const page of ["about", "about", "research", "research"]) {
    const b = browser({ session, page });
    await flush();
    assert.deepEqual(b.events(), []);
  }
});

test("duplicate evaluation leaves one click listener, visibility listener and timer", async () => {
  const b = browser(); b.evaluate(); b.evaluate();
  assert.equal(b.listeners.get("click").size, 1);
  assert.equal(b.listeners.get("visibilitychange").size, 1);
  assert.equal(b.timers.size, 1);
  assert.deepEqual(b.events(), ["visit"]);
  b.click("mailto:test@example.invalid");
  assert.deepEqual(b.events(), ["visit", "email_click"]);
  await b.tick(90000);
  assert.deepEqual(b.events(), ["visit", "email_click", "engaged"]);
});

test("all click selectors remain non-blocking even when fetch fails", async () => {
  const b = browser({ outcomes: [204, 400, 500, new Error("Offline"), "throw", 204] });
  for (const href of ["assets/files/Marwan_AlFalah_CV.pdf", "mailto:test@example.invalid", "https://scholar.google.com/citations?user=test", "https://github.com/MarwanMAlfalah/project", "https://www.linkedin.com/in/marwanmalfalah"]) b.click(href);
  await flush();
  assert.deepEqual(b.events(), ["visit", "cv_open", "email_click", "scholar_click", "github_click", "linkedin_click"]);
  b.click("research.html");
  assert.equal(b.requests.length, 6);
  assert.ok(b.requests.every((r) => r.url === "https://malfalah.vercel.app/api/track"));
  assert.ok(b.requests.every((r) => r.config.keepalive && r.config.credentials === "omit"));
});

test("attribution retains decoding, caps, session persistence and existing UTM scope", async () => {
  const session = new Map();
  const b = browser({ session, url: `${base}?ref=${encodeURIComponent("Prof A&B".repeat(20))}&utm_source=email&utm_campaign=phd&utm_medium=mail&utm_term=ai&utm_content=button` });
  await flush();
  assert.equal(b.requests[0].payload.referral.length, 80);
  assert.ok(b.requests[0].payload.referral.startsWith("Prof A&B"));
  const next = browser({ session, page: "research" });
  next.click("mailto:test@example.invalid");
  assert.equal(next.requests[0].payload.referral, b.requests[0].payload.referral);
  assert.equal(next.requests[0].payload.utmSource, "email");
  assert.equal(next.requests[0].payload.utmCampaign, "phd");
  assert.deepEqual(Object.keys(b.requests[0].payload).sort(), Object.keys(normalPayload()).sort());
});

test("path, referrer minimization and malformed stored journey remain safe", () => {
  const b = browser({ page: "research", url: `${base}research.html?ref=prof#topic`, referrer: "https://example.invalid/private?secret=value", session: new Map([[key("pages"), "{bad"]]) });
  const p = b.requests[0].payload;
  assert.equal(p.path, "/malfalah/research.html");
  assert.equal(p.referrer, "example.invalid");
  assert.deepEqual(p.pages, ["Research"]);
  assert.equal(browser({ referrer: "http://[" }).requests[0].payload.referrer, "Unknown");
});

test("API accepts normal JSON text and parsed objects with unchanged Telegram format", async () => {
  for (const body of [normalPayload(), JSON.stringify(normalPayload())]) {
    const a = await api({ body });
    assert.equal(a.res.code, 204);
    assert.equal(a.requests.length, 1);
    assert.equal(a.requests[0].body.parse_mode, "HTML");
    assert.equal(a.requests[0].body.disable_web_page_preview, true);
    assert.ok(a.requests[0].body.text.includes("New portfolio visitor"));
    assert.equal(a.res.headers["Access-Control-Allow-Origin"], origin);
  }
});

test("actual frontend payloads for every event pass the backend bounds without schema changes", async () => {
  const b = browser({ url: `${base}?ref=${encodeURIComponent("界".repeat(90))}&utm_source=${"x".repeat(90)}&utm_campaign=${"y".repeat(90)}` });
  for (const href of ["assets/files/Marwan_AlFalah_CV.pdf", "mailto:test@example.invalid", "https://scholar.google.com/citations?user=test", "https://github.com/MarwanMAlfalah/project", "https://www.linkedin.com/in/marwanmalfalah"]) b.click(href);
  await b.tick(90000);
  assert.equal(new Set(b.events()).size, 7);
  for (const { payload } of b.requests) {
    assert.equal(payload.referral.length, 80);
    assert.equal(payload.utmSource.length, 80);
    assert.equal(payload.utmCampaign.length, 80);
    assert.equal((await api({ body: JSON.stringify(payload) })).res.code, 204);
  }
});

test("all seven event names accepted; invalid event/JSON/shape rejected", async () => {
  for (const event of ["visit", "engaged", "cv_open", "email_click", "scholar_click", "github_click", "linkedin_click"]) {
    assert.equal((await api({ body: { ...normalPayload(), event } })).res.code, 204);
  }
  for (const body of ["{bad", "null", [], { event: "invalid" }, { event: " visit " }, { event: 1 }]) {
    const a = await api({ body });
    assert.equal(a.res.code, 400);
    assert.equal(a.requests.length, 0);
  }
});

test("API keeps Origin, method and bot controls", async () => {
  for (const bad of ["", "https://unrelated.invalid", `${origin}/malfalah/`]) {
    assert.equal((await api({ headers: { origin: bad } })).res.code, 403);
  }
  assert.equal((await api({ method: "OPTIONS" })).res.code, 204);
  assert.equal((await api({ method: "GET" })).res.code, 405);
  const bot = await api({ headers: { "user-agent": "Googlebot" } });
  assert.equal(bot.res.code, 204);
  assert.equal(bot.requests.length, 0);
});

test("API rejects oversized raw and parsed bodies even without honest Content-Length", async () => {
  for (const body of [{ ...normalPayload(), padding: "x".repeat(9000) }, JSON.stringify({ ...normalPayload(), padding: "x".repeat(9000) }), JSON.stringify({ ...normalPayload(), padding: "界".repeat(3000) })]) {
    for (const headers of [{}, { "content-length": "1" }]) {
      const a = await api({ body, headers });
      assert.equal(a.res.code, 413);
      assert.equal(a.requests.length, 0);
    }
  }
  assert.equal((await api({ headers: { "content-length": "9000" } })).res.code, 413);
});

test("API accepts exactly 8 KiB and rejects one byte more", async () => {
  const body = { ...normalPayload(), padding: "" };
  body.padding = "x".repeat(8192 - Buffer.byteLength(JSON.stringify(body)));
  assert.equal(Buffer.byteLength(JSON.stringify(body)), 8192);
  assert.equal((await api({ body })).res.code, 204);
  body.padding += "x";
  assert.equal((await api({ body })).res.code, 413);
});

test("API explicitly rejects out-of-bounds field lengths and wrong field types", async () => {
  const limits = { page: 80, path: 2048, referrer: 253, target: 240, referral: 80, utmSource: 80, utmCampaign: 80, sessionId: 80, device: 40, language: 30, timestamp: 40 };
  for (const [field, limit] of Object.entries(limits)) {
    assert.equal((await api({ body: { ...normalPayload(), [field]: "x".repeat(limit) } })).res.code, 204, field);
    const long = await api({ body: { ...normalPayload(), [field]: "x".repeat(limit + 1) } });
    assert.equal(long.res.code, 400, field);
    assert.equal(long.requests.length, 0);
    assert.equal((await api({ body: { ...normalPayload(), [field]: {} } })).res.code, 400, field);
  }
  for (const engagementReason of ["invalid", "x".repeat(31), {}]) {
    assert.equal((await api({ body: { ...normalPayload(), engagementReason } })).res.code, 400);
  }
});

test("API rejects oversized/non-string journeys rather than truncating", async () => {
  for (const pages of [Array(9).fill("About"), ["x".repeat(51)], [42], "About"]) {
    assert.equal((await api({ body: { ...normalPayload(), pages } })).res.code, 400);
  }
  assert.equal((await api({ body: { ...normalPayload(), pages: Array(8).fill("x".repeat(50)) } })).res.code, 204);
});

test("API keeps escaping/control stripping and accepts bounded Unicode attribution", async () => {
  const a = await api({ body: { ...normalPayload(), event: "email_click", page: "<b>test</b>\n\u0000", referral: "界".repeat(80), target: "<script>\r" } });
  assert.equal(a.res.code, 204);
  assert.ok(a.requests[0].body.text.includes("&lt;b&gt;test&lt;/b&gt;"));
  assert.ok(!a.requests[0].body.text.includes("\u0000"));
  assert.ok(a.requests[0].body.text.includes("&lt;script&gt;"));
});

test("API forwards no new browser fields and preserves Telegram failure responses", async () => {
  for (const options of [{ telegramOk: false }, { networkFails: true }]) {
    assert.equal((await api(options)).res.code, 502);
  }
  assert.equal((await api({ env: { TELEGRAM_BOT_TOKEN: "" } })).res.code, 503);
  const a = await api({ body: { ...normalPayload(), path: "PATH_ONLY_MARKER", timestamp: "TIMESTAMP_ONLY_MARKER" } });
  assert.ok(!a.requests[0].body.text.includes("PATH_ONLY_MARKER"));
  assert.ok(!a.requests[0].body.text.includes("TIMESTAMP_ONLY_MARKER"));
});
