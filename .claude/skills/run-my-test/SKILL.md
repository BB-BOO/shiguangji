---
name: run-my-test
description: Run 食光记 app, drive it with Playwright, take screenshots of all pages
---

# Run: 食光记

Next.js 15 + React 19 web app (AI 饮食分析). All paths relative to project root.
Driver: `.claude/skills/run-my-test/driver.mjs` — Playwright script that logs in,
navigates all 6 pages, sends a chat message to AI, and produces screenshots.

## Prerequisites

```bash
npm install
npx playwright install chromium
```

Requires `DEEPSEEK_API_KEY` in `.env.local` for AI chat features. Mock login
still works without it (any non-empty email/password).

## Build

```bash
npm run build   # production build — optional; dev server works fine
```

## Run (agent path)

```bash
# Start dev server in background
npm run dev &
echo $! > /tmp/nextdev.pid
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'

# Drive with Playwright
node .claude/skills/run-my-test/driver.mjs
```

Screenshots land in `.claude/skills/run-my-test/screenshots/`:
`01-login.png` → `02-profile.png` → `03-home.png` → `04-meal.png` → `05-history.png` → `06-weekly.png`

## Run (human path)

```bash
npm run dev     # http://localhost:3000 → login → use the app in browser
```

## Test

No test suite exists yet (MVP).

## Gotchas

- **Mock login has no email validation** — any non-empty text + password works.
- **Profile redirect is not enforced** — after login the app goes to `/`, not
  `/profile`, even without a saved profile. The driver navigates to `/profile`
  explicitly.
- **AI response on `/meal` depends on `DEEPSEEK_API_KEY`** — if missing or
  invalid, the API route returns 500 and the chat shows an error state.
- **localStorage is empty on each Playwright run** — fresh browser context,
  no persisted state. The driver creates a profile from scratch each time.
- **Windows taskkill leaves Next.js processes** — use `taskkill //F //IM node.exe`
  before restarting if port 3000 is held.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE :3000` | `taskkill //F //IM node.exe` |
| `Cannot find package 'playwright'` | `npm install --save-dev playwright` |
| `Executable doesn't exist at ...chrome-headless-shell` | `npx playwright install chromium` |
| Chat stuck / no AI response | Check `.env.local` has valid `DEEPSEEK_API_KEY` |
| Blank page / hydration error | `rm -rf .next && npm run dev` |
