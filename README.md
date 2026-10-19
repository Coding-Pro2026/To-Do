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
