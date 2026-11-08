# Vercel production deployment

**Verified public application: https://splitbrief-zeta.vercel.app**

The existing Vercel account is authenticated as `sopskistar`. The existing `splitbrief` project under `sopskistars-projects` was reused; no second repository or project was created. Its Node runtime was explicitly set to **24.x**. Anonymous Chromium access returned HTTP 200 and rendered the actual app. [Browser acceptance evidence](../public/evidence/deployment.json) records the latest public checks.

Production variables are configured in Vercel:

| Variable                     | Handling                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`             | Sensitive server-only value, supplied from the ignored local environment through stdin; never a command argument or client variable |
| `GEMINI_MODEL`               | `gemini-3.8-flash`                                                                                                                  |
| `AI_REQUESTS_ENABLED`        | `true`                                                                                                                              |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet`                                                                                                                            |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com`                                                                                                     |
| `NEXT_PUBLIC_SITE_URL`       | `https://splitbrief-zeta.vercel.app`                                                                                                |

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 24
npx vercel whoami
npx vercel --prod --yes --scope sopskistars-projects
node --import tsx scripts/check-production.ts
```

If a future shell has no session, run `npx vercel login` and complete the browser authorization. Do not create a new project. `scripts/configure-vercel.mjs` configures the listed production variables without printing the key; use only when an intentional environment update is needed. `.env.local`, Vercel state, test keys, local evidence, raw video, and browser reports are excluded from deployment.

The route deadline is 270 seconds, browser deadline 285 seconds, and function maximum 300 seconds, based on measured genuine Gemini latency. There are no automatic provider retries. Manual Mode remains explicit during temporary provider errors. Set Google project quota/billing safeguards; in-memory throttling cannot enforce a global serverless spending cap.

The preview deployment may have Vercel authentication protection. The production alias above was separately checked anonymously. Production screenshots and `deployment.json` are actual browser results, not proof that a human Phantom approval occurred.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [environment variables](https://vercel.com/docs/environment-variables).
