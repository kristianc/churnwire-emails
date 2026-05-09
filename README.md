# Email Templates

Multi-brand email template system. Templates are authored once with `%token%` placeholders, then stamped per-brand via a build script.

## Structure

```
src/                          # Tokenized template sources (edit these)
  magic-link.html             # Transactional: passwordless sign-in
  digest.html                 # Automated: daily churn digest with signals
  digest-empty.html           # Automated: daily digest, no signals
  marketing/
    welcome.html              # Onboarding: 3-step setup flow
    trial-ending.html         # Conversion: trial expiry with usage stats
    win-back.html             # Re-engagement: missed churn signals
    feature-announcement.html # Product: 3-benefit card layout
    feature-update.html       # Product: simple headline + body layout
    case-study.html           # Social proof: stats + customer quote
  preview-shell.html          # Viewer UI shell (injected by build)
brands/                       # Brand configs (one JSON per brand)
  churnwire.json
build.js                      # Build script
out/                          # Generated output (per brand)
templates/                    # Legacy originals (do not edit)
```

## Usage

Build all templates for a brand:

```sh
node build.js churnwire
```

Output lands in `out/churnwire/` — individual HTML files ready for copy-paste into Resend or HubSpot, plus a `preview.html` viewer.

## Creating a new brand

1. Copy `brands/churnwire.json` to `brands/yourbrand.json`
2. Change the values (see token reference below)
3. Run `node build.js yourbrand`
4. Open `out/yourbrand/preview.html` to verify

## Token reference

Tokens use `%tokenName%` syntax in template sources. The build script replaces them with values from the brand config.

### Identity

| Token | Purpose | Example |
|---|---|---|
| `%name%` | Brand name (appears in alt text, footer, preheaders) | `ChurnWire` |
| `%tagline%` | One-line tagline (footer) | `Know who's leaving before they do` |
| `%url%` | Marketing site root | `https://churnwire.com` |
| `%appUrl%` | App dashboard URL | `https://churnwire.com/app` |
| `%onboardingUrl%` | Onboarding/setup flow | `https://churnwire.com/app/onboarding` |
| `%billingUrl%` | Billing/upgrade page | `https://churnwire.com/app/settings?tab=billing` |

### Assets

| Token | Purpose | Example |
|---|---|---|
| `%headerImage%` | Email header banner (520px wide) | `https://...email-header.png` |
| `%heroImage%` | Product screenshot (used in feature emails) | `https://...churnwire-hero.png` |
| `%fontImport%` | Google Fonts `<link>` URL | `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&...` |
| `%font%` | CSS `font-family` stack | `'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif` |

### Light mode colors

| Token | Purpose | Default |
|---|---|---|
| `%accent%` | CTA buttons, highlights, signal indicators | `#E04E2A` |
| `%accentSecondary%` | Warning/amber signals, secondary stats | `#CC8A2C` |
| `%bg%` | Page background | `#FAFAF9` |
| `%card%` | Card/content background | `#FFFFFF` |
| `%text%` | Primary body text | `#2D2D2D` |
| `%textSecondary%` | Secondary body text | `#5E6370` |
| `%textMuted%` | Muted labels, footer text | `#8A8F9A` |
| `%textDark%` | Darkest text (stat values, strong headings) | `#1A1D23` |
| `%border%` | Card and element borders | `#E2E4E8` |
| `%borderLight%` | Light separators between rows | `#F0F1F3` |
| `%divider%` | Section divider lines | `#E8E9EC` |

### Dark mode colors

These only apply inside `@media (prefers-color-scheme: dark)` blocks. They are independent from light mode tokens — a brand can use the same hex for `%textDark%` and `%darkBg%` (ChurnWire does) or diverge them.

| Token | Purpose | Default |
|---|---|---|
| `%darkBg%` | Page background | `#1A1D23` |
| `%darkCard%` | Card background | `#2A2D35` |
| `%darkBorder%` | Borders | `#3A3D45` |
| `%darkText%` | Primary text | `#F0F1F3` |
| `%darkTextSecondary%` | Secondary text | `#B0B5BE` |
| `%darkTextMuted%` | Muted text | `#8A8F9A` |

## Template conventions

- Templates use table-based layout for email client compatibility
- All templates include: responsive breakpoints (`480px`), dark mode CSS, Outlook MSO conditional width fallback, hidden preheader text
- HubSpot personalization tokens (`{{contact.firstname || "fallback"}}`) are preserved in build output — the build only resolves `%brand%` tokens
- The preview viewer resolves HubSpot tokens to their fallback values so the preview renders cleanly
- The `{{ unsubscribe_link }}` token is a platform-injected URL (HubSpot/Resend) — leave it as-is

## Adding a new template

1. Create the HTML file in `src/` (or `src/marketing/`)
2. Use `%token%` placeholders for all brand-specific values — copy the token pattern from an existing template
3. Add a metadata entry to the `TEMPLATE_META` map in `build.js` (controls the display name and type badge in the preview sidebar)
4. Run `node build.js <brand>` to rebuild

## Re-tokenizing from templates/

If you've edited the legacy `templates/` directory directly and need to regenerate `src/`:

```sh
node build.js init
```

This reads `templates/`, replaces known ChurnWire values with `%token%` placeholders, and writes to `src/`. It is a one-time migration tool — after initial setup, always edit `src/` directly.
