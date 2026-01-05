# Local Development Guide

This guide helps you set up and work with the Hugo site locally using the modular architecture.

## Prerequisites

- **Hugo Extended** v0.122.0+ ([install](https://gohugo.io/installation/))
- **Go** 1.22+ ([install](https://go.dev/doc/install))
- **Git** ([install](https://git-scm.com/downloads))

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

The `go.work` file is already configured to use local modules. This means Hugo will use your local copies of the theme and content instead of fetching from GitHub.

```bash
cd damianflynn.github.io

# Initialize Hugo modules
hugo mod tidy

# Verify the setup
hugo mod graph
```

You should see output showing the local module paths.

## Daily Development Workflow

### Starting the Development Server

```bash
cd ~/Development/damianflynn/damianflynn.github.io

# Start Hugo server with drafts
hugo server -D

# Or with more verbose output
hugo server -D --disableFastRender --navigateToChanged
```

The site will be available at: http://localhost:1313

### Working on Content (Garden)

1. Edit content in the `garden` repository
2. Hugo will automatically reload (hot reload enabled)
3. Commit and push changes when ready:

```bash
cd ../garden
git add .
git commit -m "Add new post: Your Post Title"
git push origin main
```

### Working on the Theme (Haptic)

1. Edit theme files in `hugo-haptic-theme` repository
2. Hugo will automatically reload
3. Commit and push changes when ready:

```bash
cd ../hugo-haptic-theme
git add .
git commit -m "Update: description of changes"
git push origin main
```

### Working on Site Configuration

1. Edit config files in `damianflynn.github.io/config/_default/`
2. Hugo will reload automatically
3. Commit and push:

```bash
cd ~/Development/damianflynn/damianflynn.github.io
git add .
git commit -m "Config: description of changes"
git push origin main
```

## Common Tasks

### Update Module Versions

When you want to pull latest changes from remote modules:

```bash
# Update to latest versions
hugo mod get -u

# Or update specific module
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme
hugo mod get -u github.com/DamianFlynn/garden

# Clean module cache if needed
hugo mod clean
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
