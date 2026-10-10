(() => {
  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    github:
      '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3 5.4 5.4 0 0 0 19.1 0S17.9-.4 15 1.5a13.4 13.4 0 0 0-7 0C5.1-.4 3.9 0 3.9 0A5.4 5.4 0 0 0 3.7 3 5.8 5.8 0 0 0 2.2 7.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 8 18v4"/><path d="M8 19c-3 .9-3-1.5-4-2"/>',
    linkedin:
      '<rect x="3" y="9" width="4" height="12"/><path d="M5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/><path d="M11 21V9h4v2c1-1.5 2.3-2.4 4-2.4 3 0 4 2 4 5.4V21h-4v-6c0-1.8-.5-3-2-3s-2 1.2-2 3v6z"/>',
    graduation:
      '<path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
    mapPin:
      '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
    brain:
      '<path d="M9.5 4a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 5 13v1a4 4 0 0 0 4 4h1V6a2 2 0 0 0-.5-2z"/><path d="M14.5 4a3 3 0 0 1 5 2.2A3.5 3.5 0 0 1 19 13v1a4 4 0 0 1-4 4h-1V6a2 2 0 0 1 .5-2z"/><path d="M9 9H7M15 9h2M9 14H7M15 14h2"/>',
    network:
      '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6.5 10.5 10.5 6.5M13.5 6.5l4 4M17.5 13.5l-4 4M10.5 17.5l-4-4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    shield:
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-5"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.37.32.6.77.6 1.25V12c0 .48-.23.93-.6 1.25z"/>',
    fileText:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
    external:
      '<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    book: '<path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3zM20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 3z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h4"/>',
  };

  const svg = (name) => {
    const paths = ICONS[name] || ICONS.external;
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  };

  const page = document.body.dataset.page || "about";
  const navItems = [
    ["about", "About", "index.html"],
    ["research", "Research", "research.html"],
    ["publications", "Publications", "publications.html"],
    ["projects", "Projects", "projects.html"],
    ["experience", "Experience", "experience.html"],
    ["cv", "CV", "assets/files/Marwan_AlFalah_CV.pdf"],
    ["contact", "Contact", "contact.html"],
  ];

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="container nav-shell">
        <a class="brand" href="index.html" aria-label="Marwan M. Al-Falah home">
          <img src="assets/images/logo.svg" alt="" width="32" height="32">
          <span class="brand-label">Marwan M. Al-Falah</span>
        </a>
        <nav class="nav-links" id="main-nav" aria-label="Primary navigation">
          ${navItems.map(([id, label, href]) => `<a class="nav-link" href="${href}" ${page === id ? 'aria-current="page"' : ""}${id === "cv" ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`).join("")}
        </nav>
        <div class="header-actions">
          <button class="icon-btn" id="theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme"><span class="icon"></span></button>
          <button class="icon-btn menu-btn" id="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open navigation"><span class="icon">${svg("menu")}</span></button>
        </div>
      </div>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container footer-grid">
        <div>
          <div class="footer-brand">Marwan M. Al-Falah</div>
          <div class="footer-meta">MSc Researcher in Intelligent Systems<br>Peter the Great St. Petersburg Polytechnic University</div>
          <div class="footer-social" aria-label="Social links">
            <a href="https://github.com/MarwanMAlfalah" target="_blank" rel="noopener" aria-label="GitHub"><span class="icon" data-icon="github"></span></a>
            <a href="https://www.linkedin.com/in/marwanmalfalah" target="_blank" rel="noopener" aria-label="LinkedIn"><span class="icon" data-icon="linkedin"></span></a>
            <a href="https://scholar.google.com/citations?user=TC1SgRMAAAAJ&hl=en" target="_blank" rel="noopener" aria-label="Google Scholar"><span class="icon" data-icon="graduation"></span></a>
            <a href="mailto:marwanmalfalah@gmail.com" aria-label="Email"><span class="icon" data-icon="mail"></span></a>
          </div>
        </div>
        <div class="footer-copy">© <span id="year"></span> Marwan M. Al-Falah. All rights reserved.<br>Hosted on <a href="https://pages.github.com/" target="_blank" rel="noopener">GitHub Pages</a>. Last updated: October 10, 2026</div>
      </div>`;
  }

  function injectIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.dataset.icon;
      el.innerHTML = svg(name);
    });
  }

  const stored = localStorage.getItem("theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = stored || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = initialTheme;

  const themeToggle = document.getElementById("theme-toggle");
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  function syncThemeUI() {
    const isDark = document.documentElement.dataset.theme === "dark";
    if (themeToggle) {
      themeToggle.querySelector(".icon").innerHTML = svg(
        isDark ? "sun" : "moon",
      );
      themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light theme" : "Switch to dark theme",
      );
      themeToggle.title = isDark
        ? "Switch to light theme"
        : "Switch to dark theme";
    }
    if (metaTheme)
      metaTheme.setAttribute("content", isDark ? "#0B1220" : "#F8FAFC");
  }
  syncThemeUI();

  themeToggle?.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    syncThemeUI();
  });

  const menuToggle = document.getElementById("menu-toggle");
  const mainNav = document.getElementById("main-nav");
  function closeMenu() {
    mainNav?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    if (menuToggle) {
      menuToggle.setAttribute("aria-label", "Open navigation");
      menuToggle.querySelector(".icon").innerHTML = svg("menu");
    }
  }
  menuToggle?.addEventListener("click", () => {
    const open = !mainNav.classList.contains("open");
    mainNav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    menuToggle.querySelector(".icon").innerHTML = svg(open ? "close" : "menu");
  });
  mainNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  injectIcons();
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
