# Local Development Guide

This guide helps you set up and work with the Hugo site locally using the modular architecture.

## Prerequisites

- **Hugo Extended** v0.154.2+ ([install](https://gohugo.io/installation/))
- **Go** 1.22+ ([install](https://go.dev/doc/install))
- **Git** ([install](https://git-scm.com/downloads))

## Development Workflow Overview

```mermaid
graph TB
    A[Edit Files Locally] --> B{What Changed?}
    B -->|Theme Files| C[../hugo-haptic-theme/]
    B -->|Content Files| D[../garden/]
    B -->|Config Files| E[damianflynn.github.io/]
    
    C --> F[go.work detects change]
    D --> F
    E --> F
    
    F --> G[Hugo Live Reload]
    G --> H[Browser Auto-Refreshes]
    
    C --> I[Commit & Push]
    D --> J[Commit & Push]
    E --> K[Commit & Push]
    
    I --> L[Tag Release v0.x.x]
    J --> M[Triggers Garden Workflow]
    K --> N[Triggers Production Build]
    
    L --> O[Update go.mod with tag]
    M --> P[Builds Preview + Production]
    
    style F fill:#90EE90
    style G fill:#87CEEB
    style H fill:#FFD700
```

## Repository Structure

Your blog is split into 3 repositories:

```
~/Development/damianflynn/
├── damianflynn.github.io/   # Main Hugo site (this repo)
├── hugo-haptic-theme/        # Custom theme
└── garden/                   # Content from Notion
```

## Initial Setup

### 1. Clone All Repositories

```bash
cd ~/Development/damianflynn

# Clone main site
git clone https://github.com/DamianFlynn/damianflynn.github.io.git

# Clone theme
git clone https://github.com/DamianFlynn/hugo-haptic-theme.git

# Clone content
git clone https://github.com/DamianFlynn/garden.git
```

### 2. Set Up Local Development

Create a `go.work` file for local development. This file tells Go to use your local copies of the theme and content modules instead of fetching from GitHub.

**Important:** The `go.work` file is listed in `.gitignore` and should never be committed to the repository (it would break CI/CD).

```bash
cd damianflynn.github.io

# Create go.work file
cat > go.work << 'EOF'
go 1.22

use .
use ../hugo-haptic-theme
use ../garden
EOF

# Tell Hugo to use the workspace file
export HUGO_MODULE_WORKSPACE=go.work

# Or add to your shell profile (~/.zshrc or ~/.bashrc)
echo 'export HUGO_MODULE_WORKSPACE=go.work' >> ~/.zshrc

# Verify the setup shows local paths
hugo mod graph
```

You should see output showing `../hugo-haptic-theme` and `../garden` as local paths.

## Daily Development Workflow

### Starting the Development Server

```bash
cd ~/Development/damianflynn/damianflynn.github.io

# Make sure HUGO_MODULE_WORKSPACE is set
export HUGO_MODULE_WORKSPACE=go.work

# Start Hugo server with drafts and live reload
hugo server -D

# Or with more options for better development experience
hugo server -D --disableFastRender --navigateToChanged
```

The site will be available at: http://localhost:1313

**✨ Live Reload Magic:**
- Changes to **theme files** (layouts, CSS, JS) → instant browser refresh
- Changes to **content files** (markdown) → instant browser refresh  
- Changes to **config files** (TOML) → instant browser refresh
- Works across all three repositories thanks to `go.work` + `HUGO_MODULE_WORKSPACE`!

### Working on Content (Garden)

```mermaid
sequenceDiagram
    participant You
    participant Garden as ../garden/content/
    participant GoWork as go.work
    participant Hugo as Hugo Server
    participant Browser
    
    You->>Garden: Edit markdown file
    Garden->>GoWork: File change detected
    GoWork->>Hugo: Reload content
    Hugo->>Browser: Auto-refresh page
    Note over Browser: See changes instantly!
    
    You->>Garden: git commit & push
    Garden->>GitHub: Push to main
    GitHub->>Workflows: Trigger deployments
```

**Steps:**
1. Edit content in `../garden/content/posts/your-post/index.md`
2. **Save** → Browser auto-refreshes in ~500ms
3. Commit and push when ready:

```bash
cd ../garden
git add .
git commit -m "Add new post: Your Post Title"
git push origin main  # Triggers preview + production builds
```

### Working on the Theme (Haptic)

```mermaid
sequenceDiagram
    participant You
    participant Theme as ../hugo-haptic-theme/
    participant GoWork as go.work
    participant Hugo as Hugo Server
    participant Browser
    
    You->>Theme: Edit layout/CSS/JS
    Theme->>GoWork: File change detected
    GoWork->>Hugo: Rebuild with new theme
    Hugo->>Browser: Auto-refresh page
    Note over Browser: Theme changes visible!
    
    You->>Theme: git commit & push
    Theme->>GitHub: Push to main
    Note over You: Test in preview first
    You->>Theme: git tag v0.2.0
    Theme->>GitHub: Push tag
    You->>You: Update go.mod to v0.2.0
```

**Steps:**
1. Edit theme files in `../hugo-haptic-theme/layouts/` or `assets/`
2. **Save** → Browser auto-refreshes immediately
3. Commit when ready:

```bash
cd ../hugo-haptic-theme
git add .
git commit -m "Update: description of changes"
git push origin main
```

4. **Release stable version** (for production):

```bash
# Tag a release
git tag -a v0.2.0 -m "Release v0.2.0: description of changes"
git push origin v0.2.0

# Update main site to use the tagged version
cd ../damianflynn.github.io
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.2.0
hugo mod tidy
git add go.mod go.sum
git commit -m "Update theme to v0.2.0"
git push origin main  # Triggers production deployment with v0.2.0
```

**Important Notes:**
- Preview automatically uses latest `main` branch - no action needed
- Production only updates when you explicitly update `go.mod` with a tag
- Always test in preview before tagging and releasing to production

### Workflow Summary by Environment

#### Local Development
```bash
# Start server (from damianflynn.github.io/)
./dev-server.sh  # or: HUGO_MODULE_WORKSPACE=go.work hugo server -D

# Edit any file in:
# - ../hugo-haptic-theme/    → Theme changes
# - ../garden/               → Content changes  
# - config/_default/         → Site config changes

# Changes appear instantly in browser
# No commits needed to test
```

#### Preview Deployment (Cloudflare Pages)
- **Theme**: Uses latest `main` branch commit
- **Garden**: Uses latest `main` branch commit
- **Triggers**: 
  - Manual: `workflow_dispatch` in GitHub Actions
  - Automatic: Garden content updates trigger preview build
- **URL**: https://preview.damianflynn-preview.pages.dev

```bash
# To test latest theme changes in preview:
cd ~/Development/damianflynn/hugo-haptic-theme
git push origin main  # Push theme changes

# Wait ~2 minutes, or trigger manually:
cd ~/Development/damianflynn/damianflynn.github.io
# Go to GitHub Actions → Deploy Preview → Run workflow
```

#### Production Deployment (GitHub Pages)
- **Theme**: Uses tagged release (e.g., `v0.1.1`)
- **Garden**: Uses latest `main` branch commit
- **Triggers**:
  - Automatic: Pushes to main site's `main` branch
  - Automatic: Garden content updates trigger production build
- **URL**: https://damianflynn.github.io

```bash
# To deploy new theme version to production:
cd ~/Development/damianflynn/hugo-haptic-theme
git tag -a v0.2.1 -m "Release v0.2.1"
git push origin v0.2.1

cd ~/Development/damianflynn/damianflynn.github.io
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.2.1
git add go.mod go.sum
git commit -m "Update theme to v0.2.1"
git push origin main
```

# Update main site to use the tag
cd ../damianflynn.github.io
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme@v0.2.0
hugo mod tidy
git commit -am "Update theme to v0.2.0"
git push origin main
```

### Working on Site Configuration

1. Edit config files in `config/_default/`
2. **Save** → Hugo restarts and browser refreshes
3. Commit and push:

```bash
cd ~/Development/damianflynn/damianflynn.github.io
git add .
git commit -m "Config: description of changes"
git push origin main  # Triggers production build
```

## Module Version Strategy

The site uses **different theme versions** for different environments:

```mermaid
graph TB
    A[Local Development] -->|go.work| B[Uses ../hugo-haptic-theme/]
    C[Preview Environment] -->|go.mod| D[Latest main branch]
    E[Production Environment] -->|go.mod| F[Tagged Release v0.x.x]
    
    B --> G[Instant Changes<br/>No commits needed]
    D --> H[Test Latest Features<br/>Auto-updates with garden]
    F --> I[Stable & Tested<br/>Manual version bump]
    
    J[Garden Content] -->|Always| K[Latest main branch<br/>for both environments]
    
    style B fill:#90EE90
    style D fill:#FFD700
    style F fill:#87CEEB
    style K fill:#FFA500
```

### Environment Breakdown

| Environment | Theme Version | Garden Version | Purpose |
|------------|--------------|----------------|---------|
| **Local** | Local files via `go.work` | Local files via `go.work` | Development & testing |
| **Preview** | Latest `main` commit | Latest `main` commit | Test unreleased features |
| **Production** | Tagged release (e.g., `v0.1.1`) | Latest `main` commit | Stable public site |

### Why This Strategy?

1. **Local Development**: Instant feedback - save a file, see changes immediately
2. **Preview**: Test new theme features with real content before releasing
3. **Production**: Only deploy tested, tagged theme versions for stability

### Garden Content Updates

The `garden` repository (content from Notion) **always uses the latest `main` branch** in both preview and production. When you push to the garden repo, it triggers both deployments:

```bash
# Workflow in garden/.github/workflows/trigger-deployments.yaml
garden push → triggers damianflynn.github.io preview build
           → triggers damianflynn.github.io production build
```

This ensures content updates are immediately visible on both sites.

## Common Tasks

### Testing Live Reload

**Test 1: Theme Change**
1. Start Hugo: `hugo server -D`
2. Open http://localhost:1313 in Chrome/VS Code browser
3. Edit `../hugo-haptic-theme/layouts/partials/header.html`
4. **Save** → Watch browser refresh automatically (~500ms)

**Test 2: Content Change**
1. With Hugo server running
2. Edit any file in `../garden/content/posts/`
3. **Save** → Browser refreshes instantly

**Test 3: CSS Change**
1. With Hugo server running
2. Edit `../hugo-haptic-theme/assets/css/main.css`
3. **Save** → Browser hot-reloads CSS (no page refresh!)

## Troubleshooting

### Clear Hugo Caches

If you encounter persistent build errors, outdated module versions, or deprecated warnings:

```bash
# Clean all caches and generated files
./dev-server.sh clean
```

This will:
- Clear Hugo's module cache
- Remove Hugo's system cache directory (`~/Library/Caches/hugo_cache/`)
- Delete generated `resources/`, `public/`, and `_vendor/` directories

### Module Version Issues

If Hugo is using an old version of a module despite updates:

```bash
# Update to a specific commit
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@COMMIT_HASH

# Or update to latest tagged version
HUGO_MODULE_WORKSPACE=go.work hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme

# Then clean and restart
./dev-server.sh clean
./dev-server.sh
```

### Common Issues

- **"deprecated" errors**: Check for `.old` backup files in theme layouts - Hugo processes all `.html` files
- **Module not found**: Ensure `go.work` exists and `HUGO_MODULE_WORKSPACE` is set
- **Changes not reflecting**: Clear caches with `./dev-server.sh clean`
- **Build hangs or errors**: Remove `_vendor/` directory - it overrides `go.mod`

### VS Code Live Preview

Install the "Live Preview" extension and use `hugo server -D`, or:

```bash
# Hugo server binds to localhost by default
hugo server -D --bind 0.0.0.0

# Then access from VS Code browser or any device on network
# http://localhost:1313
```

### Update Module Versions

When you want to pull latest changes from remote modules:

```bash
# Update all modules to latest
hugo mod get -u

# Or update specific module
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme
hugo mod get -u github.com/DamianFlynn/garden

# Update to specific version/tag
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme@v0.2.0

# Clean module cache if needed
hugo mod clean
hugo mod tidy
```

### Build for Testing

```bash
# Build without drafts (production-like)
hugo --gc --minify

# Build with drafts (preview-like)
hugo --gc --minify -D
```

### Troubleshooting

**Module not found errors:**
```bash
# Clear Hugo cache
hugo mod clean

# Verify go.work is being used
go env GOWORK
# Should output: /Users/damian/Development/damianflynn/damianflynn.github.io/go.work
```

**Changes not reflecting:**
```bash
# Restart server without fast render
hugo server -D --disableFastRender --noHTTPCache
```

**Port already in use:**
```bash
# Use a different port
hugo server -D -p 1314
```

## Deployment

Deployment is automatic via GitHub Actions:

- **Production**: Pushes to `main` branch deploy to GitHub Pages
- **Preview**: Pull requests deploy to Cloudflare Pages

You don't need to manually deploy. Just push your changes!

## Tips for Productivity

1. **Keep Hugo running**: Let `hugo server` run while you work
2. **Work in branches**: Create feature branches for major changes
3. **Test locally first**: Always verify changes locally before pushing
4. **Use draft mode**: Add `draft: true` to frontmatter for work-in-progress posts
5. **Check module versions**: Run `hugo mod graph` periodically to see dependencies

## VS Code Setup (Optional)

Create [.vscode/settings.json](file:///Users/damian/Development/damianflynn/damianflynn.github.io/.vscode/settings.json) for better DX:

```json
{
  "files.associations": {
    "*.toml": "toml",
    "*.md": "markdown"
  },
  "markdown.preview.breaks": true,
  "markdown.preview.linkify": true,
  "[markdown]": {
    "editor.wordWrap": "on",
    "editor.quickSuggestions": true
  }
}
```

## Need Help?

- Hugo Docs: https://gohugo.io/documentation/
- Go Modules: https://go.dev/doc/modules/managing-dependencies
- Theme Repo: https://github.com/DamianFlynn/hugo-haptic-theme
- Content Repo: https://github.com/DamianFlynn/garden
