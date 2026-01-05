# damianflynn.com

My personal blog powered by Hugo, featuring a modular architecture with separate repositories for theme, content, and configuration.

## Architecture

This website uses a modular Hugo setup with three repositories:

- **[damianflynn.github.io](https://github.com/DamianFlynn/damianflynn.github.io)** (this repo) - Main Hugo site configuration
- **[hugo-haptic-theme](https://github.com/DamianFlynn/hugo-haptic-theme)** - Custom theme
- **[garden](https://github.com/DamianFlynn/garden)** - Content managed via Notion

Content is authored in [Notion](https://www.notion.so/) and automatically published using n8n workflows.

## Quick Start

### For Local Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

```bash
# Clone all three repositories side-by-side
cd ~/Development/damianflynn
git clone https://github.com/DamianFlynn/damianflynn.github.io.git
git clone https://github.com/DamianFlynn/hugo-haptic-theme.git
git clone https://github.com/DamianFlynn/garden.git

# Start development server
cd damianflynn.github.io
hugo server -D
```

## Deployment

This site uses automated deployments:

### Production
- **Platform**: GitHub Pages
- **URL**: https://damianflynn.github.io
- **Trigger**: Push to `main` branch or scheduled daily builds
- **Workflow**: [.github/workflows/deploy-production.yaml](.github/workflows/deploy-production.yaml)

### Preview
- **Platform**: Cloudflare Pages (or Azure Static Web Apps)
- **Trigger**: Pull requests or manual workflow dispatch
- **Workflow**: [.github/workflows/deploy-preview.yaml](.github/workflows/deploy-preview.yaml)
- **Features**: Includes drafts, future, and expired content

## Updating Modules

### Update Content

Content is managed in the [garden](https://github.com/DamianFlynn/garden) repository.

```bash
hugo mod get -u github.com/DamianFlynn/garden
hugo mod tidy
```

### Update Theme

Theme is managed in [hugo-haptic-theme](https://github.com/DamianFlynn/hugo-haptic-theme).

```bash
hugo mod get -u github.com/DamianFlynn/hugo-haptic-theme
hugo mod tidy
```

---

## Notion Integration Setup

<details>
<summary>Click to expand Notion integration instructions</summary>

### Create a Notion integration

Visit [my integrations](https://www.notion.so/my-integrations) and login with your Notion account.

Click on "Create new integration" to create a new internal integration.

<img width="891" alt="Create new integration" src="https://user-images.githubusercontent.com/52968553/188289065-d2e3626e-d250-4d42-9fb4-8f641f4807ea.png">

In the capabilities section, select "Read Content" and "Read user information including email address". The "Read Content" permission is necessary for Notion-Hugo to pull your Notion content, and the "Read user information including email address" permission is used to fill front matters with author information. Notion-Hugo does not collect any of your information.

<img width="891" alt="Setup capabilities" src="https://user-images.githubusercontent.com/52968553/188289098-d318ebba-46a5-4d41-bfcd-ac0f09f35f82.png">

Click the submit button to finish creating the Notion integration.

### Setup secrets for GitHub Action

Copy the Internal Integration Token.

<img width="816" alt="Copy the Internal Integration Token" src="https://user-images.githubusercontent.com/52968553/188298208-23d96254-f8a7-4571-8863-0d920bb82143.png">

Navigate to the GitHub repo you just created, click on Settings -> Secrets -> Actions.

Click the "New Repository Secret" button on the top right.

<picture>
<source media="(prefers-color-scheme: light)" width="1148" srcset="https://user-images.githubusercontent.com/52968553/188298495-f4b1aa17-fff2-4b5e-adab-2aaddce22262.png">
<source media="(prefers-color-scheme: dark)" width="1148" srcset="https://user-images.githubusercontent.com/52968553/188298501-b479534e-db88-4c07-9e72-6bf9f9fd5a8d.png">
<img width="1148" alt="Setup secrets for GitHub Action" src="https://user-images.githubusercontent.com/52968553/188298495-f4b1aa17-fff2-4b5e-adab-2aaddce22262.png">
</picture>

Add a new secret with name `NOTION_TOKEN`, paste the copied token into the secret field. Click the green "Add secret" button to save the change.

<picture>
<source media="(prefers-color-scheme: light)" width="824" srcset="https://user-images.githubusercontent.com/52968553/188298507-5402a19f-dc35-45a9-b7b7-867f38cdb001.png">
<source media="(prefers-color-scheme: dark)" width="824" srcset="https://user-images.githubusercontent.com/52968553/188298515-3c98fbf3-128e-46ef-971f-b22b6d4da9e1.png">
<img width="824" alt="Add secret NOTION_TOKEN" src="https://user-images.githubusercontent.com/52968553/188298507-5402a19f-dc35-45a9-b7b7-867f38cdb001.png">
</picture>

### Duplicate the Notion Template

Duplicate this [Notion Template](https://pcloud.notion.site/Notion-Haptic-04bcc51cfe4c49938229c35e4f0a6fb6
) into your own workspace.

### Add connection to the Notion Page

Visit the page you just duplicated, click the ellipsis button on the top right and add the integration you just created as a connection.

<picture>
<source width="553" media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/52968553/235363588-5083d629-258f-4d46-8977-fedc0285cac0.png">
<source width="553" media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/52968553/235363618-5458ea76-89c5-4817-9ea3-4d2267b34b08.png">
<img width="553" alt="Add connection to the Notion Page" src="https://user-images.githubusercontent.com/52968553/235363588-5083d629-258f-4d46-8977-fedc0285cac0.png">
</picture>

### Configure you Hugo site

On the page you just shared with the integration, click on the "share" button again, then click the "copy link" button on the bottom right to copy the link to this page.

<picture>
<source width="539" media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/52968553/188318147-b0bd8af1-b48c-4a10-b313-3789102f00ce.png">
<source width="528" media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/52968553/188318215-8d15e203-f262-495c-9e5f-81d8e1287e30.png">
<img width="539" alt="Copy link" src="https://user-images.githubusercontent.com/52968553/188318147-b0bd8af1-b48c-4a10-b313-3789102f00ce.png">
</picture>

Now navigate back to your GitHub repository, open the `notion-hugo.config.ts` file, click to edit the file.

<picture>
<source media="(prefers-color-scheme: light)" width="379" srcset="https://user-images.githubusercontent.com/52968553/188318344-f0b1e7af-f86f-44b5-99b5-74a26410477b.png">
<source media="(prefers-color-scheme: dark)" width="379" srcset="https://user-images.githubusercontent.com/52968553/188318353-930de66c-ab2a-420a-838c-1ac271ae2cba.png">
<img width="379" alt="Edit the file on GitHub" src="https://user-images.githubusercontent.com/52968553/188318344-f0b1e7af-f86f-44b5-99b5-74a26410477b.png">
</picture>

Replace the `page_url` with the link you just copied.

<picture>
<source media="(prefers-color-scheme: light)" width="779" srcset="https://user-images.githubusercontent.com/52968553/188318385-0e49a502-14b9-4abd-8496-e14defbf9138.png">
<source media="(prefers-color-scheme: dark)" width="779" srcset="https://user-images.githubusercontent.com/52968553/188318389-0fe16143-772b-4c9f-b958-74eb7d5514b2.png">
<img width="779" alt="Replace page_url" src="https://user-images.githubusercontent.com/52968553/188318385-0e49a502-14b9-4abd-8496-e14defbf9138.png">
</picture>

Click the commit changes button at the bottom to save the file.

<picture>
<source media="(prefers-color-scheme: light)" width="779" srcset="https://user-images.githubusercontent.com/52968553/188318414-b45d159c-274a-47e6-9ff6-b01f4e05379c.png">
<source media="(prefers-color-scheme: dark)" width="779" srcset="https://user-images.githubusercontent.com/52968553/188318494-b82db93b-cb72-4dcd-acfd-31accdae7ab0.png">
<img width="779" alt="Commit changes" src="https://user-images.githubusercontent.com/52968553/188318414-b45d159c-274a-47e6-9ff6-b01f4e05379c.png">
</picture>

</details>

## License

- **Code**: [MIT License](LICENSE)
- **Content**: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)

