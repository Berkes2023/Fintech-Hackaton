---
name: deploy
description: Ship Before You Sign to Vercel. Use when asked to deploy, ship, publish or push the site live.
---
# Deploy

1. Run `npm run check`, then `npm run build`. Stop and report if either fails.
2. Make sure the work is committed. Show `git status` and ask before committing anything not yet staged.
3. Push to GitHub with `git push origin main`. The Vercel project is connected to the repo, so a push to `main` triggers a production deploy and other branches get preview deploys.
4. If Git isn't connected yet, deploy with the CLI: `vercel --prod` (the user must have run `vercel login` themselves).
5. `ANTHROPIC_API_KEY` must be set in Vercel (Project → Settings → Environment Variables). Never ask the user to paste the key into chat; point them to the dashboard or `vercel env add ANTHROPIC_API_KEY`.
6. Report the deployment URL and check that `/`, `/check` and `/compare` load.
