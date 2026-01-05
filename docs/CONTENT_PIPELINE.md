# Content Pipeline Setup

This document explains how content flows from Notion → Garden → Preview/Production sites.

## Architecture

```
Notion (via n8n)
    ↓
Garden Repository (content module)
    ↓
    ├─→ Preview Build (drafts, latest theme)
    └─→ Production Build (published only, stable theme)
```

## Garden Repository Webhooks

When content is pushed to the `garden` repository, it automatically triggers deployments.

### Setup Steps

1. **Create Personal Access Token (PAT)**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Name: `Garden Deployment Trigger`
   - Scopes: Select `repo` (full control of private repositories)
   - Click "Generate token" and copy it

2. **Add Token to Garden Repository**
   - Navigate to `garden` repository
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `DISPATCH_TOKEN`
   - Value: Paste the PAT from step 1
   - Click "Add secret"

3. **Verify Workflow File Exists**
   - The file `.github/workflows/trigger-deployments.yaml` should exist in the garden repository
   - This was created automatically

## Theme Versioning Strategy

### Production (Stable)
Production uses versioned releases of the theme specified in `go.mod`:

```go
require (
    github.com/DamianFlynn/hugo-haptic-theme v0.1.1
    github.com/DamianFlynn/garden v0.0.0-20250515182533-xyz
)
```

To update production theme:
1. Test theme changes in preview first
2. Tag a new release in hugo-haptic-theme repository
3. Update go.mod in main repository:
   ```bash
   hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme@v0.1.2
   hugo mod tidy
   git commit -am "Update theme to v0.1.2"
   git push
   ```

### Preview (Development)
Preview can test unreleased theme versions by using a branch or latest commit.

**Option 1: Use latest commit from main**
```bash
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme@main
hugo mod tidy
```

**Option 2: Use specific branch for testing**
```bash
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme@feature/new-layout
hugo mod tidy
```

**Option 3: Use go.work for local preview testing**
Your `go.work` file already handles this - local development always uses your local theme changes.

## Build Triggers Summary

### Production Builds
| Trigger | Purpose |
|---------|---------|
| Push to main | Config/module updates |
| Garden push | New published content |
| Daily at midnight | Catch publishDate/expiryDate changes |
| Manual | Testing/debugging |

### Preview Builds
| Trigger | Purpose |
|---------|---------|
| Pull request | Test config changes |
| Garden push | Preview new content with drafts |
| Manual | Testing theme changes |

## Content Workflow

1. **Author content in Notion**
   - Set `draft: true` for work-in-progress
   - Set `publishDate` for scheduled publishing
   - Set `expiryDate` for time-limited content

2. **n8n exports to Garden**
   - Notion → Markdown conversion
   - Commits to garden repository
   - Triggers garden workflow

3. **Garden triggers builds**
   - Preview: Shows all content (including drafts)
   - Production: Only shows published content

4. **Review in Preview**
   - Check draft posts at preview URL
   - Verify layout/formatting

5. **Publish content**
   - Remove `draft: true` from Notion
   - n8n re-exports to Garden
   - Production build runs
   - Content goes live

## Testing Theme Changes

1. **Make theme changes locally**
   - Edit files in `../hugo-haptic-theme`
   - Test with `hugo server -D`
   - Local go.work uses local theme automatically

2. **Push theme changes**
   - Commit and push to hugo-haptic-theme repository
   - Tag a release if ready for production

3. **Test in preview (optional)**
   - Update go.mod to use latest theme commit
   - Create PR to trigger preview build
   - Review preview site

4. **Promote to production**
   - Merge PR
   - Production builds with new theme version

## Troubleshooting

### Garden not triggering builds
- Check that `DISPATCH_TOKEN` secret exists in garden repository
- Verify the PAT has `repo` scope
- Check garden workflow logs for errors

### Preview showing old theme
- Check go.mod in main repository
- Run `hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme@main`
- Verify module cache cleared in workflow

### Production showing drafts
- Check frontmatter: `draft: true` should be removed
- Verify production workflow doesn't use `--buildDrafts` flag
- Check publishDate is in the past
