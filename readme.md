# A GDOC document watcher

A Cloudflare worker to watch for change(s) in Google Documents.

## Deploy

```bash
# Deploy
npm install
npx wrangler login
npx wrangler deploy

# Config
npx wrangler secret put DISCORD_WEBHOOK 
npx wrangler secret put DOC_ID
npx wrangler secret put GCP_SERVICE_ACCOUNT --env ifsclchangelog
```
