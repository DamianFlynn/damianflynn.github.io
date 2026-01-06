# Development & Deployment Workflow

This document explains how theme versions and content are managed across local development, preview, and production environments.

## Quick Reference

| Environment | Theme Version | Garden (Content) | URL |
|-------------|---------------|------------------|-----|
| **Local** | Local files (via `go.work`) | Local files (via `go.work`) | http://localhost:1313 |
| **Preview** | Latest `main` branch | Latest `main` branch | https://preview.damianflynn-preview.pages.dev |
| **Production** | Tagged release (e.g., `v0.1.1`) | Latest `main` branch | https://damianflynn.github.io |

## The Three Environments

### 1. Local Development (Instant Feedback)

**Purpose**: Rapid development and testing

**How it works**:
- Uses `go.work` file to reference local directories
- Changes to theme/content appear instantly (no commits needed)
- Hugo hot-reloads CSS and auto-refreshes pages

**Setup**:
```bash
cd ~/Development/damianflynn/damianflynn.github.io
./dev-server.sh  # Starts Hugo with HUGO_MODULE_WORKSPACE=go.work
```

**Module resolution**:
```
go.work tells Hugo to use:
├── ../hugo-haptic-theme/  → Local theme files
└── ../garden/             → Local content files
```

### 2. Preview Environment (Test Latest)

**Purpose**: Test unreleased theme features with real content

**How it works**:
- Uses `go.mod` to download latest commits from `main` branch
- Deploys to Cloudflare Pages
- Includes drafts, future posts, and expired content

**Theme updates**:
```bash
# Preview automatically uses latest theme main branch
# No manual updates needed - just push to theme repo:
cd ~/Development/damianflynn/hugo-haptic-theme
git push origin main
# Preview will use this on next deployment
```

**Deployment triggers**:
- Garden content updates (automatic via `repository_dispatch`)
- Manual trigger via GitHub Actions UI
- Pull requests to main site

### 3. Production Environment (Stable Release)

**Purpose**: Public-facing stable site

**How it works**:
- Uses `go.mod` with **tagged theme versions** (e.g., `v0.1.1`)
- Deploys to GitHub Pages
- Only published content (no drafts/future posts)

**Theme updates** (manual process):
```bash
# 1. Tag theme release
cd ~/Development/damianflynn/hugo-haptic-theme
git tag -a v0.2.0 -m "Release v0.2.0: new features"
git push origin v0.2.0

# 2. Update production to use tag
cd ~/Development/damianflynn/damianflynn.github.io
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.2.0
git add go.mod go.sum
git commit -m "Update theme to v0.2.0"
git push origin main
```

**Deployment triggers**:
- Pushes to main site's `main` branch
- Garden content updates (automatic via `repository_dispatch`)

## Common Workflows

### Scenario 1: Developing a New Theme Feature

```bash
# 1. Edit theme locally
cd ~/Development/damianflynn/hugo-haptic-theme
# Edit layouts/partials/header.html
# Save → Hugo auto-reloads → See changes instantly

# 2. Test thoroughly in local environment
# Browse site, check all page types

# 3. Commit to theme repository
git add .
git commit -m "Add dark mode toggle to header"
git push origin main

# 4. Test in preview (automatic)
# Preview will deploy with latest main on next trigger
# Or manually trigger via GitHub Actions

# 5. Verify preview works correctly
# Visit https://preview.damianflynn-preview.pages.dev

# 6. Release to production when ready
git tag -a v0.2.0 -m "Release v0.2.0: Add dark mode"
git push origin v0.2.0

cd ~/Development/damianflynn/damianflynn.github.io
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.2.0
git add go.mod go.sum
git commit -m "Update theme to v0.2.0"
git push origin main
```

### Scenario 2: Writing New Content

```bash
# 1. Create content in Notion
# Notion → Export → garden repository

# 2. Or edit directly
cd ~/Development/damianflynn/garden/content/posts/my-article
# Edit index.md
# Save → Hugo auto-reloads → See changes instantly

# 3. Commit and push
git add .
git commit -m "Add article: How to Deploy with Hugo"
git push origin main

# 4. Automatic deployments (no action needed!)
# garden workflow triggers:
#   → Preview deployment (latest theme main)
#   → Production deployment (tagged theme version)
```

### Scenario 3: Site Configuration Changes

```bash
# 1. Edit config locally
cd ~/Development/damianflynn/damianflynn.github.io/config/_default
# Edit params.toml, menu.toml, etc.
# Save → Hugo auto-reloads

# 2. Commit and push
git add config/
git commit -m "Update site navigation menu"
git push origin main

# 3. Deployments triggered automatically
# Production deployment starts (~2 minutes)
```

### Scenario 4: Emergency Fix to Production

If you need to hotfix production without waiting for full testing:

```bash
# 1. Make fix in theme
cd ~/Development/damianflynn/hugo-haptic-theme
# Fix critical bug
git add .
git commit -m "Fix: critical rendering issue"
git push origin main

# 2. Immediately tag for production
git tag -a v0.1.2 -m "Hotfix v0.1.2: Fix rendering issue"
git push origin v0.1.2

# 3. Update production
cd ~/Development/damianflynn/damianflynn.github.io
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.1.2
git add go.mod go.sum
git commit -m "Hotfix: Update theme to v0.1.2"
git push origin main
```

## Version Management

### Theme Versioning Strategy

Use [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., `v1.0.0` → `v2.0.0`)
- **MINOR**: New features, backward compatible (e.g., `v0.1.0` → `v0.2.0`)
- **PATCH**: Bug fixes (e.g., `v0.1.1` → `v0.1.2`)

**Example versioning**:
```bash
# Bug fix
git tag -a v0.1.2 -m "Fix: CSS alignment issue"

# New feature
git tag -a v0.2.0 -m "Feature: Add search functionality"

# Breaking change
git tag -a v1.0.0 -m "Breaking: Restructure template hierarchy"
```

### Checking Current Versions

```bash
# Check what version production is using
cd ~/Development/damianflynn/damianflynn.github.io
cat go.mod | grep hugo-haptic-theme

# Check latest theme tag
cd ~/Development/damianflynn/hugo-haptic-theme
git tag -l | tail -5

# Check what preview is using (always latest main)
cd ~/Development/damianflynn/hugo-haptic-theme
git log -1 --oneline
```

## CI/CD Pipeline Details

### Production Workflow ([deploy-production.yaml](../.github/workflows/deploy-production.yaml))

```yaml
Trigger: push to main
Steps:
  1. Checkout code
  2. Setup Hugo & Go
  3. Download Go modules (go mod download)
     → Downloads theme at tagged version from go.mod
     → Downloads garden at latest main branch
  4. Build site (hugo --minify --gc)
     → Uses stable theme version
     → Uses latest content
  5. Deploy to GitHub Pages
```

### Preview Workflow ([deploy-preview.yaml](../.github/workflows/deploy-preview.yaml))

```yaml
Trigger: workflow_dispatch OR repository_dispatch from garden
Steps:
  1. Checkout code
  2. Setup Hugo & Go
  3. Download Go modules (go mod download)
     → Downloads theme at latest main (even if go.mod has a tag)
     → Downloads garden at latest main branch
  4. Build site with drafts (hugo --buildDrafts --buildFuture)
     → Uses bleeding-edge theme
     → Uses latest content + drafts
  5. Deploy to Cloudflare Pages
```

### Garden Trigger Workflow ([garden/.github/workflows/trigger-deployments.yaml](../../garden/.github/workflows/trigger-deployments.yaml))

```yaml
Trigger: push to garden main branch
Steps:
  1. Trigger preview deployment via repository_dispatch
  2. Trigger production deployment via repository_dispatch
```

## Troubleshooting

### Preview not using latest theme

**Problem**: You pushed theme changes but preview still shows old version

**Solution**: 
```bash
# Trigger preview deployment manually
# Go to GitHub → damianflynn.github.io → Actions → Deploy Preview → Run workflow
```

### Production using wrong theme version

**Problem**: `go.mod` has wrong theme version

**Solution**:
```bash
cd ~/Development/damianflynn/damianflynn.github.io

# Check current version
cat go.mod | grep hugo-haptic-theme

# Update to specific version
HUGO_MODULE_WORKSPACE=go.work hugo mod get github.com/DamianFlynn/hugo-haptic-theme@v0.2.0

# Commit
git add go.mod go.sum
git commit -m "Update theme to v0.2.0"
git push origin main
```

### Local changes not reflecting

**Problem**: Hugo server not picking up local changes

**Solution**:
```bash
# Verify go.work is being used
HUGO_MODULE_WORKSPACE=go.work hugo mod graph
# Should show local paths, not github.com URLs

# If not working, restart server
./dev-server.sh clean
./dev-server.sh
```

### Module cache issues

**Problem**: Build using old module versions despite updates

**Solution**:
```bash
# Clear Hugo caches
hugo mod clean
rm -rf ~/Library/Caches/hugo_cache  # macOS
# or
rm -rf ~/.cache/hugo_cache  # Linux

# Clear Go module cache
go clean -modcache

# Rebuild
hugo mod get -u
hugo mod tidy
```

## Best Practices

1. **Always test locally first**: Use `./dev-server.sh` before pushing
2. **Test in preview before tagging**: Push to theme `main`, verify in preview, then tag
3. **Use descriptive tag messages**: `git tag -a v0.2.0 -m "Feature: Add comments system"`
4. **Keep production stable**: Only update theme tags when thoroughly tested
5. **Document breaking changes**: Update README.md and CHANGELOG.md for major versions
6. **Clean caches when in doubt**: `./dev-server.sh clean` solves many issues

## See Also

- [DEVELOPMENT.md](../DEVELOPMENT.md) - Local development setup
- [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) - Cloudflare Pages configuration
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
