# Marwan M. Al-Falah — Academic Research Portfolio

Static academic portfolio designed for GitHub Pages. No Node.js, npm, bundler, framework, or build step is required.

## Structure
- `index.html` — narrative homepage and current research
- `research.html` — active research directions and MSc thesis
- `publications.html` — publication record
- `projects.html` — research prototypes and repositories
- `experience.html` — engineering and research experience
- `contact.html` — research/PhD contact page
- `assets/css/styles.css` — design tokens and all responsive styles
- `assets/js/app.js` — shared navigation, footer, icons, theme persistence and mobile navigation

## Design system
- Headings: Space Grotesk
- Body/UI: Inter
- Primary: `#14B8A6`
- Accent: `#2DD4BF`
- Soft accent: `#99F6E4`
- Dark base: `#0B1220` / `#0F172A`

## Updating content
Keep factual content in the page that owns it. Shared site chrome stays in `app.js`. Reusable visual rules and tokens stay in `styles.css`. Add future projects using the existing `project-detail` pattern and publications using `pub-full`.

## GitHub Pages
The official portfolio is https://marwanmalfalah.github.io/malfalah/, served from the root of the `master` branch in `MarwanMAlfalah/malfalah`. Keep portfolio URLs under `/malfalah/`.

Vercel hosts the tracking backend at `/api/track`. `vercel.json` adds `X-Robots-Tag: noindex` to Vercel responses to suppress indexing of duplicate static pages; it does not change API routing.

The project-level `robots.txt` points to the sitemap, but crawlers read robots rules at the origin root (`https://marwanmalfalah.github.io/robots.txt`); that root file belongs to the GitHub Pages user site.


## 2026 research milestones included
- Ongoing ITMO University collaboration targeting a Q1 journal submission on multimodal operating-room monitoring.
- Selected on-site participation in SMILES 2026 (Nanjing University × Skoltech, Suzhou) and the WebPilot research project / manuscript submission.

## Content maintenance
`assets/data/site-content.json` keeps high-level research milestones in a compact structured form. HTML stays pre-rendered for SEO and zero-build GitHub Pages deployment.
