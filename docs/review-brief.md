# Alble App Review — UX/UI Improvement Opportunities

## App Context
- Next.js 16, React 19, Drizzle/Turso, Tailwind v4, Recharts
- Single-user web app for tracking dog separation anxiety training
- Pages: Today (input), History (browse/edit), Charts (analytics), Settings
- Auth: simple password login, cookie-based session
- Mobile-first with bottom tab bar, desktop top nav
- Data model: sessions (one per day) → steps (one per training unit within a day)
- Each step: duration (h/m/s), rating (5-tier), optional note

---

## Observations

### High Impact

1. **Duration input is clunky** — Three separate number fields (hours/minutes/seconds) on mobile is frustrating. Most training sessions are < 1 hour. A single text input with smart parsing ("1h 30m", "90m", "3600") or quick-preset buttons (30s, 1m, 2m, 5m, 10m, 15m, 30m, 1h) would dramatically improve the core input loop.

2. **No progress/goal tracking** — The app is a pure data logger. For separation anxiety training specifically, users want to see: "longest successful session", "days since last Abbruch", "improvement trend". Zero motivation/encouragement data visible on the Today page.

3. **Time zone bug** — `new Date().toISOString().slice(0,10)` gives UTC date. User is in Europe/Vienna (CET/CEST). Sessions created after midnight local time but before midnight UTC get the previous day's date. Needs `Intl.DateTimeFormat` or manual offset handling.

### Medium Impact

4. **Empty state is cold** — New users see "Noch keine Daten. Lege auf Heute die erste Einheit an" — no onboarding, no tips, no quick-start guidance. First-time user experience is bare.

5. **No undo for step/session deletion** — One tap deletes, no confirmation toast, no undo. Very easy to lose data by accident on mobile.

6. **Double bottom bar on Today (mobile)** — Bottom tab nav + fixed input card at `bottom-16`. Input card occupies significant vertical space, scrolls awkwardly, and the "sticky" behavior feels jarring.

7. **Charts: jittered scatter plot** — The "Trennungszeit-Verteilung je Bewertung" uses `Math.random()` for jitter, so points move on every re-render. A box plot or violin plot would be more informative and deterministic.

8. **No session-level notes from Today page** — You can add notes to individual steps, but the session itself can only get notes from History → edit metadata. Inconsistent.

9. **History defaults to today** — The DateEntryForm's default date is today, but you're on the "History/Verlauf" page looking at past data. Cognitive mismatch.

10. **No dark mode toggle** — next-themes is set up but no UI switch exposed to the user. System theme only.

### Lower Impact

11. **Login screen is bare** — Functional but no warmth, no dog-themed illustration or friendly copy.

12. **No PWA/offline** — No manifest, no service worker. Dog training happens on walks, often with spotty connectivity.

13. **RatingPicker button labels inconsistent** — "Ausgez." is abbreviated but others aren't. On desktop there's room for full labels.

14. **No search/filter on History** — With months of data, finding a specific day requires scrolling through grouped cards.

15. **CVS import is silent about skipped rows** — Sessions with existing `global_day` are silently skipped. No warning to user about duplicates.

16. **Chart data recomputed every render** — No aggressive memoization, could be slow with hundreds of sessions.

17. **No session date editing from Today** — If you accidentally train on the wrong date (or time zone issue), you can only fix it in History.
