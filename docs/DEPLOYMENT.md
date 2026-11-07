# Vercel deployment

The production build passed. Vercel CLI 65.12.1 is available through npx but reports **Logged out**. No live deployment or URL is claimed. GitHub authentication is available, and this repo is the existing `sopskistar/SplitBrief` repository.

## Shortest path: dashboard import

1. Sign in at [Vercel](https://vercel.com/new), choose **Import Git Repository**, and select **sopskistar/SplitBrief**. Do not create a second GitHub repository.
2. Keep Next.js as the framework, root directory `.`, install `npm ci`, build `npm run build`, and Node **24.x**. No database or external storage is required.
3. Add these environment variables in the project settings:

| Variable                     | Value / handling                                                                |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`             | Enter the existing secret directly in Vercel; server-only, never `NEXT_PUBLIC_` |
| `GEMINI_MODEL`               | `gemini-3.8-flash`                                                              |
| `AI_REQUESTS_ENABLED`        | `true`, or `false` to stop AI requests                                          |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet`                                                                        |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` or a compatible Devnet endpoint                 |
| `NEXT_PUBLIC_SITE_URL`       | The actual production HTTPS origin after Vercel assigns it                      |

4. Deploy. Set the actual site origin and redeploy if necessary so metadata, robots, and sitemap use it. The app also recognizes Vercel's production-domain environment variable.
5. Open the returned URL and check `/`, `/verify`, `/judges`, `/privacy`, `/how-it-works`, `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, and a missing route.
6. Try the interpreter once. Check the actual provider result; the local provider requests currently time out. Manual Mode must remain available and visibly labeled.
7. Personally perform the [Phantom Devnet test](TEST_WALLETS.md), then record/rebuild the public evidence and check `/verify` on the deployed origin.

## CLI alternative

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 24
npx vercel login
npx vercel link
npx vercel env add GEMINI_API_KEY production
# Enter the secret in Vercel's protected prompt, never as a command argument.
# Add the other listed variables in project settings or equivalent env prompts.
npx vercel --prod
```

Keep `.env.local` and `.local-test-keys/` ignored. `.vercelignore` explicitly excludes local secrets, private test artifacts, browser reports, and raw video. Never deploy persistent test signers. Public JSON evidence contains only sample instructions, public addresses/signatures, receipt data, and sanitized provider errors.

The server function has a 30-second platform maximum around a 20-second model deadline. The route has no automatic provider retry. Set Google project quota/billing limits; a serverless in-memory map does not enforce a global spend cap. Production runtime environment variables are configured at Vercel, not committed to Git.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel environment variables](https://vercel.com/docs/environment-variables).
