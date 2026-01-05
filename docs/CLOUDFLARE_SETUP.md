# Setting Up Cloudflare Pages for Preview Deployments

This guide walks you through setting up Cloudflare Pages for your Hugo preview deployments.

## Why Cloudflare Pages for Previews?

- **Free tier**: Unlimited sites, bandwidth, and requests
- **Fast global CDN**: Excellent performance worldwide
- **Preview URLs**: Automatic preview URLs for every PR
- **Simple setup**: Integrates directly with GitHub
- **No configuration needed**: Works with Hugo out of the box

## Prerequisites

- A Cloudflare account (free tier is fine)
- GitHub account with damianflynn.github.io repository

## Setup Steps

### 1. Create Cloudflare Account

1. Visit [cloudflare.com](https://www.cloudflare.com/) and sign up for a free account
2. You don't need to add a domain for Pages to work

### 2. Get Cloudflare API Token

1. Navigate to your [Cloudflare profile](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template
4. Under "Account Resources", select your account
5. Under "Zone Resources", select "All zones"
6. Click "Continue to summary" then "Create Token"
7. **Copy the token** (you won't be able to see it again)

### 3. Get Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on "Workers & Pages" in the left sidebar
3. Your Account ID is shown on the right side
4. **Copy the Account ID**

### 4. Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/DamianFlynn/damianflynn.github.io
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add two secrets:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: [paste the API token]
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: [paste the Account ID]

### 5. Create Cloudflare Pages Project (Optional)

You can either:
- **Let GitHub Actions create it automatically** (recommended)
- Or manually create it:
  1. Go to Cloudflare Dashboard → Workers & Pages
  2. Click "Create application" → "Pages" tab
  3. Click "Create using direct upload"
  4. Project name: `damianflynn-preview`
  5. Skip the initial deployment

### 6. Test the Workflow

1. Create a test branch:
   ```bash
   git checkout -b test-preview
   git commit --allow-empty -m "Test preview deployment"
   git push origin test-preview
   ```

2. Create a pull request from `test-preview` to `main`

3. The GitHub Actions workflow will:
   - Build your Hugo site with drafts
   - Deploy to Cloudflare Pages
   - Add a comment to your PR with the preview URL

### 7. Access Your Preview

Once deployed, you'll get URLs like:
- **Production branch**: `damianflynn-preview.pages.dev`
- **PR previews**: `[commit-hash].damianflynn-preview.pages.dev`

## Customization Options

### Custom Domain for Preview

If you want a custom domain for previews:

1. In Cloudflare Dashboard → Pages → your project
2. Go to "Custom domains"
3. Add a domain like `preview.damianflynn.com`
4. Update your DNS as instructed

### Build Configuration

The workflow is already configured correctly, but if you need to modify:

Edit [.github/workflows/deploy-preview.yaml](.github/workflows/deploy-preview.yaml):

```yaml
- name: Build Preview Site
  run: hugo --minify --buildDrafts --buildExpired --buildFuture
  env:
    HUGO_ENV: development
```

## Troubleshooting

### Deployment fails with "Project not found"

The first deployment creates the project automatically. If it fails:
1. Manually create the project in Cloudflare Dashboard
2. Ensure the project name matches: `damianflynn-preview`

### API Token permission errors

Ensure your API token has:
- Account: Cloudflare Pages - Edit permission
- Zone: All zones (or specific zone if you added a custom domain)

### Preview URL not showing in PR

Check:
1. The workflow has `pull-requests: write` permission
2. The GitHub Actions bot isn't blocked in your repository settings

## Alternative: Azure Static Web Apps

If you prefer Azure:

1. Create an Azure account (free tier available)
2. Create a Static Web App in Azure Portal
3. Get the deployment token
4. Add `AZURE_STATIC_WEB_APPS_API_TOKEN` to GitHub secrets
5. Modify the deploy-preview.yaml to use Azure action instead:

```yaml
- name: Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "public"
```

## Next Steps

After setup:
- Test by creating a PR
- Verify the preview URL works
- Share preview URLs with collaborators for review
- Merge to main to publish to production (GitHub Pages)

## Support

- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- GitHub Actions docs: https://docs.github.com/en/actions
- Hugo docs: https://gohugo.io/documentation/
