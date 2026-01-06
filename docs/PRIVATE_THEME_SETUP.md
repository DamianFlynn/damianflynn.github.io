# Setup for Private Theme Repository

The hugo-haptic-theme repository is now private. To allow GitHub Actions to access it, you need to create a Personal Access Token (PAT).

## Step 1: Create a Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Give it a descriptive name: `Damian Flynn GitHub Pages - Private Modules`
3. Set expiration: `No expiration` (or choose your preference)
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click **Generate token**
6. **IMPORTANT**: Copy the token immediately (you won't see it again)

## Step 2: Add the Token as a Repository Secret

1. Go to https://github.com/DamianFlynn/damianflynn.github.io/settings/secrets/actions
2. Click **New repository secret**
3. Name: `PRIVATE_REPO_TOKEN`
4. Value: Paste the PAT you copied
5. Click **Add secret**

## Step 3: The workflows have already been updated

The workflows are configured to use this token. Once you add the secret, they will work automatically.

## What This Enables

- GitHub Actions can access your private hugo-haptic-theme repository
- Local development continues to work (uses `go.work` with local files)
- Both preview and production deployments will work

## Security Notes

- The token is encrypted and only accessible to workflows in this repository
- It's never exposed in logs or outputs
- Consider setting an expiration and rotating it periodically
