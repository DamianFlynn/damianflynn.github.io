# Commit and Deploy Guide

## What Changed

This restructuring updates the Hugo blog to use:
- Separate workflows for production and preview
- Hugo modules with go.work for local development
- Cloudflare Pages for preview deployments
- GitHub Pages for production

## Committing Changes

### Step 1: Review Changes

```bash
cd ~/Development/damianflynn/damianflynn.github.io
git status
git diff
```

### Step 2: Stage All Changes

```bash
# Add new files
git add .github/workflows/deploy-production.yaml
git add .github/workflows/deploy-preview.yaml
git add go.work
git add DEVELOPMENT.md
git add docs/

# Stage modifications
git add README.md
git add go.mod
git add go.sum

# Stage deletion
git add .github/workflows/hugo-build-deploy.yaml
```

Or simply:
```bash
git add -A
```

### Step 3: Commit

```bash
git commit -m "Restructure Hugo deployment with separate production and preview workflows

- Split deployment into production (GitHub Pages) and preview (Cloudflare Pages)
- Add go.work for seamless local development with Hugo modules
- Update Hugo version to 0.139.0 in workflows
- Remove old combined workflow (hugo-build-deploy.yaml)
- Add comprehensive documentation:
  - DEVELOPMENT.md for local development guide
  - docs/CLOUDFLARE_SETUP.md for Cloudflare setup
  - docs/SETUP_SUMMARY.md for complete overview
  - docs/TROUBLESHOOTING.md for common issues
- Clean up go.mod, remove problematic replace directives

BREAKING CHANGE: Requires Cloudflare API tokens to be set for preview deployments"
```

### Step 4: Push

```bash
# Pull latest changes first
git pull --rebase origin main

# Push your changes
git push origin main
```

## After Pushing

### 1. Monitor Production Deployment

1. Go to https://github.com/DamianFlynn/damianflynn.github.io/actions
2. Watch the "Deploy Production" workflow
3. Should complete in ~2-3 minutes
4. Check https://damianflynn.github.io

### 2. Set Up Cloudflare (if not done)

Follow [docs/CLOUDFLARE_SETUP.md](../docs/CLOUDFLARE_SETUP.md):

1. Get Cloudflare API token
2. Get Cloudflare Account ID  
3. Add secrets to GitHub:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### 3. Test Preview Workflow

Create a test PR:
```bash
# Create test branch
git checkout -b test-preview-workflow

# Make a small change
echo "# Test" >> test.md
git add test.md
git commit -m "Test: Preview deployment"

# Push and create PR
git push origin test-preview-workflow
```

Then create PR on GitHub and watch the preview deployment.

## Fixing Content Errors

The error in the last workflow run was:
```
mapping key "summary" already defined
```

This is in your garden content repository. To fix:

```bash
cd ~/Development/damianflynn/garden

# Find the file with duplicate keys
find content/series -name "_index.md" -type f -exec grep -l "summary.*summary" {} \;

# Or use the troubleshooting script
bash /path/to/find-duplicate-keys.sh
```

The specific file is likely:
```
content/series/Azure IoT Operations/_index.md
```

Edit it and remove the duplicate `summary` key in the frontmatter.

## Workflow Triggers

### Production Workflow

Triggers on:
- ✅ Push to main branch
- ✅ Daily at midnight (scheduled)
- ✅ Manual dispatch
- ✅ Repository dispatch (from garden updates)

### Preview Workflow  

Triggers on:
- ✅ Pull requests to main
- ✅ Manual dispatch

## Verification Checklist

After deploying:

- [ ] Production site loads: https://damianflynn.github.io
- [ ] GitHub Actions completed successfully
- [ ] No errors in workflow logs
- [ ] Site content is up to date
- [ ] Theme renders correctly
- [ ] Images load properly
- [ ] Navigation works
- [ ] Cloudflare tokens added (for future PRs)

## If Something Goes Wrong

### Production Deployment Failed

1. Check [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
2. Look at GitHub Actions logs
3. Test locally: `hugo --minify --gc`
4. Fix the issue and push again

### Preview Not Working

1. Verify Cloudflare secrets are set
2. Check preview workflow logs
3. Ensure Cloudflare Pages project exists

### Content Errors

1. Check garden repository for YAML issues
2. Fix duplicate keys or syntax errors
3. Push fixes to garden repo
4. Trigger rebuild: `git commit --allow-empty -m "Trigger rebuild" && git push`

## Rolling Back

If you need to revert:

```bash
# Revert to previous commit
git revert HEAD

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

**Note:** Old workflow file is deleted, but you can restore it from git history if needed.

## Next Steps

1. ✅ Commit and push changes
2. ✅ Monitor production deployment
3. ⬜ Set up Cloudflare Pages
4. ⬜ Fix content errors in garden repo
5. ⬜ Test preview workflow with a PR
6. ⬜ Update other team members on new workflow

---

**Ready to deploy?** Run the commit command above and push!
