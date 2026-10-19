# Momentum — priority-driven to-do tracker

A beautiful, fast to-do app that tracks deadlines, ranks what to do next, and shows a month of activity.

## Features
- **Tasks with deadlines** — title, description of what to do, date, optional time, priority (Low → Urgent).
- **Priority engine** — every open task gets a score: base priority + urgency that ramps up over the final 14 days + an escalation bonus once a deadline is missed (growing daily, capped). The dashboard's "Do this next" and every list are ordered by it.
- **Missed deadlines vault** — overdue tasks are collected on their own page, escalated above on-time work, and can be rescheduled in one click.
- **Monthly activity** — month navigator, calendar with deadline/missed/completed markers, per-day completions chart, on-time rate, upcoming deadlines, and a day detail panel.
- **Polish** — framer-motion animations (shared-layout nav/tabs, spring lists, animated counters and rings), light/dark theme, responsive layout, undo for complete/delete, reduced-motion support.
- **Private** — data lives only in your browser's `localStorage` (validated on load; corrupt data is ignored safely).

## Scripts
```bash
npm install
npm run dev        # start dev server
npm run build      # typecheck + production build
npm test           # unit tests for dates, priority engine, stats, storage
```

Stack: React, TypeScript, Vite, framer-motion, lucide-react.

## Security notes
- No backend and no network calls: tasks never leave the browser (`localStorage`).
- All user text is rendered through React (auto-escaped); there is no `dangerouslySetInnerHTML`, `eval` or dynamic script loading.
- Anything read back from storage is treated as untrusted: shapes, dates, times, priorities and timestamps are validated and repaired, text is length-capped, task count is capped, and corrupt data is ignored.
- The production build ships a strict Content-Security-Policy (`script-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`).
- An error boundary replaces a blank page with a reload / reset screen if rendering ever fails.
- Dependencies: `npm audit` reports 0 vulnerabilities and the lockfile pins every package to the npm registry.
- When hosting, also send `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`) and `X-Content-Type-Options: nosniff` as response headers; these cannot be set from a `<meta>` tag.
