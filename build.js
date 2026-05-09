#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");
const TEMPLATES = path.join(ROOT, "templates");
const BRANDS = path.join(ROOT, "brands");
const OUT = path.join(ROOT, "out");

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function r(str, search, replacement) {
  return str.split(search).join(replacement);
}

// --- init: tokenize templates/ → src/ ---

function tokenize(html) {
  // 1. Dark mode CSS block — replace colors with dark-specific tokens
  html = html.replace(
    /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\s{4}\}/,
    (match, inner) => {
      inner = r(inner, "#1A1D23", "%darkBg%");
      inner = r(inner, "#2A2D35", "%darkCard%");
      inner = r(inner, "#3A3D45", "%darkBorder%");
      inner = r(inner, "#F0F1F3", "%darkText%");
      inner = r(inner, "#B0B5BE", "%darkTextSecondary%");
      inner = r(inner, "#8A8F9A", "%darkTextMuted%");
      return `@media (prefers-color-scheme: dark) {${inner}\n    }`;
    }
  );

  // 2. URLs (longest first to avoid partial matches)
  html = r(html, "https://churnwire.com/app/onboarding", "%onboardingUrl%");
  html = r(html, "https://churnwire.com/app/settings?tab=billing", "%billingUrl%");
  html = r(html, "https://api.segment8.com/storage/v1/object/public/ws-04-02/churnwire-hero.png", "%heroImage%");
  html = r(html, "https://api.segment8.com/storage/v1/object/public/ws-04-02/email-header.png", "%headerImage%");
  html = r(html, "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap", "%fontImport%");
  html = r(html, "https://churnwire.com/app", "%appUrl%");
  html = r(html, "https://churnwire.com", "%url%");

  // 3. Font stack
  html = r(html, "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", "%font%");

  // 4. Brand text
  html = r(html, "ChurnWire", "%name%");
  html = r(html, "Know who’s leaving before they do", "%tagline%");
  html = r(html, "Know who's leaving before they do", "%tagline%");

  // 5. Light mode colors (dark mode block already handled)
  html = r(html, "#E04E2A", "%accent%");
  html = r(html, "#CC8A2C", "%accentSecondary%");
  html = r(html, "#FAFAF9", "%bg%");
  html = r(html, "#FFFFFF", "%card%");
  html = r(html, "#2D2D2D", "%text%");
  html = r(html, "#5E6370", "%textSecondary%");
  html = r(html, "#8A8F9A", "%textMuted%");
  html = r(html, "#1A1D23", "%textDark%");
  html = r(html, "#E2E4E8", "%border%");
  html = r(html, "#F0F1F3", "%borderLight%");
  html = r(html, "#E8E9EC", "%divider%");

  return html;
}

function init() {
  const files = walk(TEMPLATES);
  if (!files.length) {
    console.error("No templates found in templates/");
    process.exit(1);
  }

  for (const file of files) {
    const rel = path.relative(TEMPLATES, file);
    const dest = path.join(SRC, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const html = fs.readFileSync(file, "utf8");
    fs.writeFileSync(dest, tokenize(html));
    console.log(`  ${rel}`);
  }
  console.log(`\nTokenized ${files.length} templates → src/`);
}

// --- build: src/ → out/<brand>/ ---

function applyBrand(html, brand) {
  return html.replace(/%([a-zA-Z]+)%/g, (match, key) => {
    if (key in brand) return brand[key];
    console.warn(`  warning: unknown token ${match}`);
    return match;
  });
}

function resolveHubspotTokens(html) {
  // {{foo || "fallback"}} → fallback
  html = html.replace(/\{\{[^}]*?\|\|\s*"([^"]*)"\s*\}\}/g, "$1");
  // {{foo}} with no fallback → remove
  html = html.replace(/\{\{[^}]*?\}\}/g, "");
  return html;
}

const TEMPLATE_META = {
  "magic-link": { name: "Magic Link", type: "transactional" },
  "digest": { name: "Daily Digest", type: "digest" },
  "digest-empty": { name: "Daily Digest (empty)", type: "digest" },
  "welcome": { name: "Welcome", type: "marketing" },
  "trial-ending": { name: "Trial Ending", type: "marketing" },
  "win-back": { name: "Win-back", type: "marketing" },
  "feature-announcement": { name: "Feature Announcement", type: "marketing" },
  "feature-update": { name: "Feature Update (simple)", type: "marketing" },
  "case-study": { name: "Case Study", type: "marketing" },
};

function buildPreview(brandName, brand, brandedFiles) {
  const shellPath = path.join(SRC, "preview-shell.html");
  if (!fs.existsSync(shellPath)) {
    console.log("  skipping preview (no src/preview-shell.html)");
    return;
  }

  let shell = fs.readFileSync(shellPath, "utf8");
  shell = applyBrand(shell, brand);

  const inlined = [];
  const entries = [];

  for (const [rel, html] of brandedFiles) {
    const id = rel
      .replace(/\.html$/, "")
      .replace(/^marketing\//, "")
      .replace(/\//g, "-");
    const scriptId = `tpl-${id}`;
    const previewHtml = resolveHubspotTokens(html);
    inlined.push(
      `  <script id="${scriptId}" type="text/html">\n${previewHtml}  </script>`
    );

    const meta = TEMPLATE_META[id] || {
      name: id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
      type: rel.startsWith("marketing/") ? "marketing" : "transactional",
    };

    entries.push(
      `      { id: '${id}', name: '${meta.name}', type: '${meta.type}', scriptId: '${scriptId}' }`
    );
  }

  shell = shell.replace("<!-- TEMPLATES -->", inlined.join("\n\n"));
  shell = shell.replace("/* TEMPLATE_ENTRIES */", entries.join(",\n"));

  const outPath = path.join(OUT, brandName, "preview.html");
  fs.writeFileSync(outPath, shell);
  console.log("  preview.html");
}

function build(brandName) {
  const configPath = path.join(BRANDS, `${brandName}.json`);
  if (!fs.existsSync(configPath)) {
    console.error(`Brand config not found: brands/${brandName}.json`);
    process.exit(1);
  }

  const brand = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const outDir = path.join(OUT, brandName);
  fs.mkdirSync(outDir, { recursive: true });

  const srcFiles = walk(SRC).filter(
    (f) => path.basename(f) !== "preview-shell.html"
  );
  const emailFiles = [];

  console.log(`\nBuilding ${brandName}:`);
  for (const file of srcFiles) {
    const rel = path.relative(SRC, file);
    const dest = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const html = fs.readFileSync(file, "utf8");
    const branded = applyBrand(html, brand);
    fs.writeFileSync(dest, branded);
    if (!rel.startsWith("pages/")) emailFiles.push([rel, branded]);
    console.log(`  ${rel}`);
  }

  buildPreview(brandName, brand, emailFiles);
  console.log(`\n${srcFiles.length} files → out/${brandName}/`);
}

// --- CLI ---

const cmd = process.argv[2];
if (!cmd) {
  console.log("Usage:");
  console.log("  node build.js init           Tokenize templates/ → src/");
  console.log("  node build.js <brand>        Build src/ → out/<brand>/");
  process.exit(0);
}

if (cmd === "init") {
  init();
} else {
  build(cmd);
}
