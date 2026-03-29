# Walrus Sites — Decentralized Frontend Hosting

Walrus is Sui's decentralized blob storage. Walrus Sites lets you host static sites (HTML/JS/CSS) on it, served via `<base36-id>.walrus.site`. No HTTP server needed.

## How It Works

1. Files are uploaded to Walrus blob storage with erasure coding (~4.5x redundancy)
2. A Sui object tracks the site metadata and ownership
3. The site is accessible at `<base36-id>.walrus.site`

## Setup

Install the `site-builder` CLI from https://github.com/MystenLabs/walrus

Create `sites-config.yaml` in the project root (or `~/.config/walrus/`) with Sui wallet and network config.

## Deploy

First deploy (creates a new site):

```bash
site-builder deploy --epochs max ./web
```

This outputs an object ID and saves it to `ws-resources.json`.

Subsequent deploys (updates existing site):

```bash
site-builder deploy --epochs <N> ./web
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `site-builder deploy` | Publish or update a site |
| `site-builder convert` | Convert object ID to Base36 subdomain |
| `site-builder sitemap` | List all resources in a site |
| `site-builder update-resource` | Replace a single file |
| `site-builder destroy` | Permanently remove a site |

## For Our Project

Our frontend is already static files in `web/` (nimponents JS + sui-bundle.js + HTML/CSS), so the deploy target is just `./web`. The flow would be:

1. `make frontend-build` to generate `web/app.js` and `web/sui-bundle.js`
2. `site-builder deploy --epochs max ./web` to publish
3. Set the Walrus site URL as the dApp URL on our SSU in-game

## References

- https://docs.wal.app/
- https://github.com/MystenLabs/walrus-sites
- https://github.com/MystenLabs/walrus/blob/main/docs/content/sites/getting-started/using-the-site-builder.mdx
