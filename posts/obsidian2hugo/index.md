# Obsidian2Hugo


My Blog has evolved over the years, initially hosted on Wordpress, but some 6 years back I abandond that plaform for Static Sites, initially with Jekyll and used Github Pages, but that also got sunset in favor of my current generator Hugo.

As part of my current workflow, I use Obsidian for almost all my notes, which includes the posts which you get to read publically on this blog.

To make this happen, there are some very cool open source projects which I am relying to pipeline the content for its raw source, to the presentation which is finally published.

All the documentation I create, presonally and professionally, is authored in Markdown. So keeping this source standard based is critically important to me.

One thing I didn’t like was to have to put the title into frontmatter and to manually write the description used by hugo as a `<meta>` description which is important for search engine optimization (SEO). The here introduced `obsidian2hugo` does exactly this. I t parses a obsidian source (sub)tree, parses every markdown file and extracts (and deletes) a `h1` title (if present) and uses the content of a named `h2` header (standard `## tl;dr`)


## Obsidian Export

https://github.com/aadimator/obsidian-export

### Dependencies

Install the rust development tools on our workstation

```bash
xcode-select --install
brew install rust
```

### Clone and Build
Grab the source of the tool, and compile it

```bash
cd ~/vault
git clone https://github.com/aadimator/obsidian-export
cd obsidian-export
cargo build --release --locked
cp target/release/obsidian-export ~/vault/obsidian-exporter
cd ..
./obsidian-exporter --help
```

## Export from the Vault

```bash
mkdir ./damianflynn.com-hugo/content/article
./obsidian-exporter ./Cranium/knowledge/blog  ./damianflynn.com-hugo/content/article --hard-linebreaks --no-recursive-embeds --embed-info --hugo-frontmatter --retain-wikilinks --flat

# Using a Start-At folder
./obsidian-exporter ./Cranium/  ./damianflynn.com-hugo/content/article --start-at ./Cranium/knowledge/blog --hard-linebreaks --no-recursive-embeds --embed-info  --retain-wikilinks --flat --hugo-frontmatter

# Using an .export-ignore
./obsidian-exporter ./Cranium/  ./damianflynn.com-hugo/content/article --hard-linebreaks --no-recursive-embeds --embed-info  --retain-wikilinks --flat --hugo-frontmatter

### From the Video
./obsidian-exporter ./Cranium/  ./damianflynn.com-hugo/content/article --add-titles --frontmatter=always
```

## Hugo Obsidian

### Install

```bash
go install github.com/aadimator/hugo-obsidian@latest
```

### Test

```bash
~/go/bin/hugo-obsidian --help
```

### Convert Content

```bash
hugo-obsidian -input=./damianflynn.com-hugo/content/article -output=damianflynn.com-hugo/assets/indices -index=true -root=.
```

---
<!-- enrich:containment -->
*Part of: damianflynn*

