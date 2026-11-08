# STATUS.md — bill-calendar-webapp

## What was built

A fully static, local-first month-view bill calendar (no accounts, no network, no build step):

- **Month calendar** rendered from a four-column CSV (`name, amount, dueDay, autopay`) via file picker or drag-and-drop; bad rows are skipped, good rows still load, quoted fields/`$`/commas in amounts supported.
- **Due-this-week highlighting**: the current Sunday–Saturday week is tinted plus a "Due by hand this week" summary list that excludes autopay bills; "today" gets an outlined cell. Highlights only appear when the displayed month matches today's month.
- **Autopay handling**: autopay bills render green (`✔`) chips and are excluded from the manual-pay week list; flags `yes/no/true/false/y/n/1/0/x/on/autopay` accepted case-insensitively.
- **One-page printable money calendar**: Print button opens `window.print()`; `@page { size: letter landscape }`, controls/legend hidden, title + total + week list printed at top — designed to fit one sheet for the fridge.
- **Short-month handling**: dueDay 31 in February lands on the last day of the month (clamped), same for 30-day months.
- **Testing**: `tests.html` static test page (15 engine tests, pass/fail table, PASS/FAIL in title bar) plus terminal runners `tests.cjs` (engine) and `smoke.cjs` (DOM-stubbed rendering/interaction checks).
- Sample data (`sample-bills.csv`) loads on first open so the app is demonstrable immediately.

## How to run it

- Open `index.html` directly in a browser (no server needed). Optional: `python3 -m http.server` in this folder.
- Load a CSV (picker or drag-drop) or use the sample; navigate months with Prev/Next/Today; Print for the fridge page.
- Tests: open `tests.html` in a browser, or run `npm test` (= `node tests.cjs`) and `node smoke.cjs` from the terminal. Node 20 was used for verification.

## Verification results

- `node --check` clean on `app.js`, `ui.js`, `test-runner.js`, `tests.js`.
- `node tests.cjs`: **15/15 passed** (CSV parsing incl. quotes/bad rows, month mapping + sorting, short-month clamp, Sun–Sat week window, this-week manual filtering, totals, money formatting, 6×7 grid shape, today/this-week flags, out-of-month cells empty).
- `node smoke.cjs`: **19/19 passed** (rendering via stubbed DOM: 7 headers, 42 cells, bill chips incl. autopay styling, file/text loading, empty state, prev/next, Today click flags exactly 1 today cell and 7 week cells, no render duplication, invalid dueDay rows skipped).
- HTML tag-balance check: `index.html` and `tests.html` both BALANCED.
- No browser (headless) available in this environment; browser checks are structural above — the test page is the runnable browser verification (`tests.html`).

## Known gaps

- Monthly modeling only — no recurring intervals (annual, quarterly) or paid/remaining tracking; this stays a simple month view by design.
- Week highlight uses today's calendar week only; there's no "overdue" or "due in 3 days" badge beyond the week tint.
- No editing of bills in-app — CSV is the source of truth; saving changes means re-saving the CSV.
- Print layout tuned for letter landscape; other paper sizes aren't explicitly tested.
- The `cloneNode`-based "this week" print row duplicates text fine for simple names but doesn't clone deeply nested markup (not currently needed).
- Browser verification was done structurally (engine unit tests + stubbed-DOM smoke tests); pixel-perfect print output was not visually confirmed in a real browser/print environment.
