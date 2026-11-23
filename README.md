# damianflynn.com

[![Deploy Production](https://github.com/DamianFlynn/damianflynn.github.io/actions/workflows/deploy-production.yaml/badge.svg)](https://github.com/DamianFlynn/damianflynn.github.io/actions/workflows/deploy-production.yaml)
[![Deploy Preview](https://github.com/DamianFlynn/damianflynn.github.io/actions/workflows/deploy-preview.yaml/badge.svg)](https://github.com/DamianFlynn/damianflynn.github.io/actions/workflows/deploy-preview.yaml)

My personal blog powered by Hugo, featuring a modular architecture with separate repositories for theme, content, and configuration.

🌐 **Live Site**: https://damianflynn.github.io  
🔬 **Preview Site**: https://preview.damianflynn-preview.pages.dev

## Architecture

```mermaid
graph TB
    subgraph "Content Creation"
        A[Notion] -->|Export| B[garden Repository]
    end
    
    subgraph "Development"
        C[hugo-haptic-theme<br/>Custom Theme] -->|go.work| D[Local Development]
        B -->|go.work| D
        E[damianflynn.github.io<br/>Site Config] -->|go.work| D
        D -->|Hugo Server| F[localhost:1313]
    end
    
    subgraph "Theme Releases"
        C -->|git push main| G[Latest Changes]
        G -->|Test & Verify| H[git tag v0.x.x]
    end
    
    subgraph "Preview Environment"
        B -->|Push to main| I[Trigger Preview Build]
        I -->|go mod: latest main| J[Hugo Build<br/>with Drafts]
        J -->|Deploy| K[Cloudflare Pages<br/>preview.damianflynn-preview.pages.dev]
    end
    
    subgraph "Production Environment"
        B -->|Push to main| L[Trigger Production Build]
        E -->|Push to main| L
        H -->|Update go.mod| L
        L -->|go mod: tagged version| M[Hugo Build<br/>published only]
        M -->|Deploy| N[GitHub Pages<br/>damianflynn.github.io]
    end
    
    style F fill:#90EE90
    style K fill:#FFD700
    style N fill:#87CEEB
    style H fill:#FFA500
```

## Repository Structure

This blog is built from four separate repositories that work together:

| Repository | Purpose | Status | Links |
|-----------|---------|--------|-------|
| **[damianflynn.github.io](https://github.com/DamianFlynn/damianflynn.github.io)** | Main site configuration, Hugo modules, deployment workflows | [![Deploy Production](https://github.com/DamianFlynn/damianflynn.github.io/actions/workflows/deploy-production.yaml/badge.svg)](https://github.com/DamianFlynn/damianflynn.github.io/actions/workflows/deploy-production.yaml) | [Production](https://damianflynn.github.io) \| [Preview](https://preview.damianflynn-preview.pages.dev) |
| **[hugo-haptic-theme](https://github.com/DamianFlynn/hugo-haptic-theme)** | Custom Hugo theme with layouts, CSS, JS | Theme | [Docs](https://github.com/DamianFlynn/hugo-haptic-theme#readme) |
| **[garden](https://github.com/DamianFlynn/garden)** | Content repository synced from Notion | [![Sync Notion Content](https://github.com/DamianFlynn/garden/actions/workflows/sync-notion-content.yaml/badge.svg)](https://github.com/DamianFlynn/garden/actions/workflows/sync-notion-content.yaml) | [Content](https://github.com/DamianFlynn/garden/tree/main/content) |
| **[notion-to-markdown](https://github.com/DamianFlynn/notion-to-markdown)** | Notion API v5 export tool (Docker) | [![Docker Build](https://github.com/DamianFlynn/notion-to-markdown/actions/workflows/docker-image.yml/badge.svg)](https://github.com/DamianFlynn/notion-to-markdown/actions/workflows/docker-image.yml) | [Container](https://ghcr.io/damianflynn/notion-to-markdown) |

### Content Flow

```mermaid
graph LR
    A[Notion] -->|Every 6h| B[notion-to-markdown]
    B -->|Export| C[garden repo]
    C -->|Trigger| D[damianflynn.github.io]
    D -->|Deploy| E[Preview Site]
    D -->|Deploy| F[Production Site]
    G[hugo-haptic-theme] -.->|Hugo Module| D
    
    style A fill:#fff,stroke:#333
    style B fill:#0db7ed,stroke:#333
    style C fill:#90EE90,stroke:#333
    style D fill:#FFD700,stroke:#333
    style E fill:#FFA500,stroke:#333
    style F fill:#87CEEB,stroke:#333
    style G fill:#FF69B4,stroke:#333
```

## Quick Start

### Local Development

```bash
# Clone all repositories side-by-side
cd ~/Development/damianflynn
git clone https://github.com/DamianFlynn/damianflynn.github.io.git
git clone https://github.com/DamianFlynn/hugo-haptic-theme.git
git clone https://github.com/DamianFlynn/garden.git

# Start development server
cd damianflynn.github.io
./dev-server.sh
```

Visit http://localhost:1313 - changes to theme/content auto-reload instantly!

**See [SETUP.md](SETUP.md) for complete setup instructions.**

## Synced social comments

Replies to a page's social announcement posts (X, LinkedIn, Bluesky) are shown on the page as a threaded discussion, rendered at build time. Readers' browsers make no third-party calls.

- A page opts in with `comments: {x: <url>, linkedin: <url>, bluesky: <url>}` in its front matter (a `mastodon` link is shown as a join link only; Zernio cannot read it).
- `.github/workflows/sync-comments.yaml` runs `scripts/sync-comments.mjs` every 15 minutes (and on demand). It reads the garden repo's page list only when the garden `main` sha changes, makes one Zernio list call, and reads a thread only when its comment count changed (plus a re-read around 03:00 UTC of threads that have comments, to pick up edits and hides). A run with nothing to do makes two API calls and exits in seconds.
- Polling is age-based per tracked post: younger than 48 hours every run, up to 14 days at most hourly, older at most daily.
- It cannot get stuck: each platform fails on its own (a 429 on X never blocks LinkedIn or Bluesky, and data that did change is still committed); failures back off exponentially in `_state.json` (15 min doubling to 6 h, or the `Retry-After` value) instead of sleeping; at most 20 thread reads per run; a low `X-RateLimit-Remaining` ends the run early; existing data is never blanked. After 6 failed runs for a platform the run emits a `::warning::` annotation and after 24 an `::error::`, and still exits 0 so the schedule keeps going. (A rejected API key, HTTP 401, does fail the run.)
- Changes land as `data/comments/<posts|talks>-<slug>.json` in one `chore(comments): sync social replies` commit on `main`; when reader-visible data changed the workflow then dispatches `deploy-production.yaml`. `data/comments/_state.json` is the script's own bookkeeping (a state-only commit is not deployed); do not edit it.
- Secrets: `ZERNIO_API_KEY` (Zernio API key) and `PRIVATE_REPO_TOKEN` (reads the garden repo). Without the key the run logs a notice and exits cleanly.
- Hide a comment: add its `id` (as found in the data file) to the JSON list in `data/comments/_hidden.json`, e.g. `["urn:li:comment:(...)"]`. Its replies go with it. Hiding the comment on the platform itself (Zernio `isHidden`) has the same effect.
- Cost: the repository is public so Actions minutes are free; Zernio inbox reads are cheap but X reads are metered (fractions of a cent), which is why X threads are read only when their count changes.
- Tests: `node --test scripts/test-sync-comments.mjs` (offline, mocked Zernio and GitHub).

## Deployment Strategy

### Environment Versioning

| Environment | Theme Version | Content Version | Purpose |
|-------------|---------------|-----------------|---------|
| **Local** | Local files (`go.work`) | Local files | Instant development feedback |
| **Preview** | Latest `main` branch | Latest `main` | Test unreleased features |
| **Production** | Tagged releases (e.g., `v0.1.1`) | Latest `main` | Stable public site |

### How Deployments Work

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Theme as hugo-haptic-theme
    participant Garden as garden (content)
    participant Site as damianflynn.github.io
    participant Preview as Cloudflare Pages
    participant Prod as GitHub Pages
    
    Note over Dev,Theme: Theme Development
    Dev->>Theme: Edit layouts/CSS
    Dev->>Dev: Test locally (instant reload)
    Dev->>Theme: git push main
    Note over Theme: Theme changes ready for testing
    
    Dev->>Garden: Update content
    Garden->>Site: Trigger preview build
    Garden->>Site: Trigger production build
    
    Note over Site,Preview: Preview Build
    Site->>Preview: Hugo build with latest theme main
    Preview-->>Dev: https://preview.damianflynn-preview.pages.dev
    
    Note over Dev: Verify theme works correctly
    
    Dev->>Theme: git tag v0.2.0
    Dev->>Site: Update go.mod to v0.2.0
    Site->>Prod: Hugo build with tagged theme
    Prod-->>Dev: https://damianflynn.github.io
```

### Deployment Triggers

**Preview** (Cloudflare Pages):
- Garden content updates (automatic)
- Manual trigger via GitHub Actions

**Production** (GitHub Pages):
- Garden content updates (automatic)
- Main site config/workflow changes
- Theme version updates in go.mod

## Common Tasks

### Writing New Content

1. Create/edit in Notion → Export to garden repository
2. Or edit directly: `cd ~/Development/damianflynn/garden/content/posts/`
3. Test locally (auto-reloads)
4. Commit and push → Both environments deploy automatically

```bash
cd ~/Development/damianflynn/garden
git add .
git commit -m "Add article: My New Post"
git push origin main
# Preview and production deploy automatically
```

### Developing Theme Features

1. Edit theme files: `~/Development/damianflynn/hugo-haptic-theme/`
2. Test locally (auto-reloads)
3. Push to test in preview
4. Tag when stable for production

```bash
cd ~/Development/damianflynn/hugo-haptic-theme
# Edit layouts, CSS, JS...
git add .
git commit -m "Feature: Add dark mode toggle"
git push origin main
# Preview uses this automatically

# After testing, release to production:
git tag -a v0.2.0 -m "Release v0.2.0: Dark mode support"
git push origin v0.2.0

cd ~/Development/damianflynn/damianflynn.github.io
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.2.0
git add go.mod go.sum
git commit -m "Update theme to v0.2.0"
git push origin main
```

### Updating Site Configuration

```bash
cd ~/Development/damianflynn/damianflynn.github.io
# Edit config/_default/*.toml files
git add config/
git commit -m "Update site navigation"
git push origin main
# Production deploys automatically
```

## Project Files

```
damianflynn.github.io/
├── config/              # Hugo configuration
│   └── _default/
│       ├── config.toml  # Site settings
│       ├── params.toml  # Theme parameters
│       ├── menu.toml    # Navigation
│       └── ...
├── .github/
│   └── workflows/
│       ├── deploy-production.yaml   # GitHub Pages deployment
│       └── deploy-preview.yaml      # Cloudflare Pages deployment
├── go.mod              # Module dependencies (production versions)
├── go.work            # Local development workspace (gitignored)
├── dev-server.sh      # Local development helper script
└── public/            # Generated site (gitignored)
```

## Technology Stack

- **[Hugo](https://gohugo.io/)** v0.154.2+ Extended - Static site generator
- **[Go](https://go.dev/)** 1.22+ - Module system
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD
- **[GitHub Pages](https://pages.github.com/)** - Production hosting
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Preview hosting
- **[Notion](https://notion.so/)** - Content authoring

## Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide for local development and cloud deployments
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Versioning Strategy

The theme uses [Semantic Versioning](https://semver.org/):

- **v0.1.x** - Bug fixes and patches
- **v0.x.0** - New features (backward compatible)
- **vx.0.0** - Breaking changes

Content in the `garden` repository is always deployed from the latest `main` branch.

## Contributing

This is a personal blog, but if you find issues or have suggestions:

1. Open an issue in the relevant repository
2. For theme issues: [hugo-haptic-theme/issues](https://github.com/DamianFlynn/hugo-haptic-theme/issues)
3. For site issues: [damianflynn.github.io/issues](https://github.com/DamianFlynn/damianflynn.github.io/issues)

## License

- Site content: © Damian Flynn
- Theme code: GPL-3.0 License (see [hugo-haptic-theme/LICENSE](https://github.com/DamianFlynn/hugo-haptic-theme/blob/main/LICENSE))

---

Built with ❤️ using Hugo and Go modules

