# Troubleshooting Content Errors

## Common Hugo Build Errors

### Error: "mapping key already defined"

**Example:**
```
ERROR error: failed to create resource: mapping key "summary" already defined at [2:1]
```

**Cause:** Duplicate YAML frontmatter keys in your content files.

**Solution:**
1. Find the problematic file (shown in error message)
2. Open the file and check frontmatter
3. Remove duplicate keys

```yaml
---
title: "My Post"
summary: "First summary"   # Duplicate!
date: 2024-01-01
summary: "Second summary"  # Remove this
---
```

### Error: "Process completed with exit code 1"

**Cause:** General Hugo build failure. Check the logs for specific errors.

**Common causes:**
- Duplicate frontmatter keys
- Invalid YAML syntax
- Missing required frontmatter fields
- Broken shortcodes
- Invalid image references

**Solution:**
1. Check GitHub Actions logs for specific error
2. Test locally: `hugo --verbose`
3. Fix the issue in your content
4. Push the fix

### Error: "unknown revision" or "module not found"

**Example:**
```
go: github.com/DamianFlynn/garden@v0.1.0: unknown revision v0.1.0
```

**Cause:** Git tag doesn't exist or module version mismatch.

**Solution:**
```bash
# Clean Hugo cache
hugo mod clean

# Get latest versions
hugo mod get -u

# Verify modules
hugo mod graph
```

### Error: "invalid PNG format" or image processing errors

**Cause:** Corrupted image files or unsupported image formats.

**Solution:**
1. Find the problematic image
2. Re-export from source
3. Or convert using ImageMagick:
   ```bash
   convert problematic.png -strip fixed.png
   ```

## Debugging Locally

### Test Production Build

```bash
# Simulate GitHub Actions production build
hugo --minify --gc --ignoreCache
```

### Test with Verbose Output

```bash
# See all warnings and errors
hugo --verbose --debug
```

### Check Specific Content File

```bash
# Validate a single file
hugo --ignoreCache --verbose | grep "your-file-name"
```

### Check Module Status

```bash
# See current module versions
hugo mod graph

# See module paths
hugo mod vendor
ls _vendor
```

## Garden Content Issues

### Finding Duplicate Keys in Frontmatter

```bash
cd ../garden

# Find files with duplicate YAML keys
find content -name "*.md" -type f -exec sh -c '
  for file; do
    # Extract frontmatter and check for duplicates
    awk "/^---$/{f=!f;next}f" "$file" | \
    awk -F: "{print \$1}" | \
    sort | uniq -d | \
    grep -v "^$" && echo "Duplicate keys in: $file"
  done
' sh {} +
```

### Validating All Content

```bash
cd ../garden

# Check all markdown files for basic issues
find content -name "*.md" -type f | while read file; do
  echo "Checking: $file"
  # Check for basic frontmatter structure
  if ! grep -q "^---$" "$file"; then
    echo "  ⚠️  Missing frontmatter delimiter"
  fi
done
```

## GitHub Actions Debugging

### View Detailed Logs

1. Go to Actions tab in GitHub
2. Click on the failed workflow
3. Click on the failed job
4. Expand each step to see details
5. Look for ERROR or WARN messages

### Re-run with Debug Logging

1. Go to the workflow run
2. Click "Re-run jobs"
3. Check "Enable debug logging"
4. Click "Re-run jobs"

### Test Workflow Locally (with act)

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run production workflow
act -j build-deploy-production

# Run with secrets
act -j build-deploy-production --secret-file .secrets
```

## Module Update Issues

### Force Update Modules

```bash
# In main site directory
hugo mod clean
rm -rf _vendor go.sum
hugo mod get -u
hugo mod tidy
```

### Use Specific Module Version

Edit `go.mod`:
```go
require (
    github.com/DamianFlynn/garden v0.0.0-20250515182533-099b31e0c469
    github.com/DamianFlynn/hugo-haptic-theme v0.1.1-0.20250515190355-a2f71f183ec1
)
```

Then:
```bash
hugo mod tidy
```

### Check Module Cache

```bash
# See what's cached
ls -la $(hugo config | grep cacheDir)/modules

# Clear specific module
rm -rf $(hugo config | grep cacheDir)/modules/pkg/mod/github.com/damianflynn
```

## Content Fixes

### Fix YAML Frontmatter

**Before (broken):**
```yaml
---
title: "My Post"
summary: "First summary"
tags: [tag1, tag2]
summary: "Duplicate!"  # ❌ Duplicate key
---
```

**After (fixed):**
```yaml
---
title: "My Post"
summary: "First summary"
tags: [tag1, tag2]
---
```

### Fix Invalid YAML Syntax

**Common issues:**
- Missing quotes around special characters
- Incorrect indentation
- Unclosed brackets or quotes

```yaml
# ❌ Bad
title: My Post: A Guide
tags: [tag1, tag2

# ✅ Good
title: "My Post: A Guide"
tags: [tag1, tag2]
```

## Prevention

### Pre-commit Hook

Create `.git/hooks/pre-commit` in garden repo:

```bash
#!/bin/bash
# Validate content before committing

echo "Validating content..."

# Check for duplicate frontmatter keys
find content -name "*.md" -type f | while read file; do
  duplicates=$(awk '/^---$/{f=!f;next}f' "$file" | \
    awk -F: '{print $1}' | sort | uniq -d | grep -v '^$')
  
  if [ -n "$duplicates" ]; then
    echo "❌ Duplicate keys in $file:"
    echo "$duplicates"
    exit 1
  fi
done

echo "✅ Content validation passed"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### VS Code Extension

Install "YAML" extension for better validation:
```bash
code --install-extension redhat.vscode-yaml
```

## Getting Help

1. **Check logs** first - most errors have clear messages
2. **Test locally** - reproduce the issue on your machine
3. **Search docs** - Hugo docs are comprehensive
4. **GitHub Issues** - Check if others had similar issues
5. **Ask in discussions** - Hugo forum or Discord

## Quick Reference

```bash
# Clean everything and rebuild
hugo mod clean && hugo server -D

# Force module update
hugo mod get -u ./...

# Check Hugo version
hugo version

# Validate without building
hugo --renderToMemory

# Build with maximum verbosity
hugo --debug --verbose --log --logFile hugo.log
```

## Common Workflow Fixes

### Workflow Not Triggering

- Check branch name (should be `main`)
- Verify workflow file syntax
- Check if Actions are enabled in repo settings

### Deployment Failing

- Verify GitHub Pages is enabled
- Check branch is set to `gh-pages`
- Ensure proper permissions in workflow

### Cloudflare Deployment Failing

- Verify API token is set
- Check account ID is correct
- Ensure project name matches

---

**Remember:** Most errors are in the content, not the theme or configuration!
