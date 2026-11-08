# Bill Calendar

A local-first, month-view **money calendar for the fridge**: point it at a simple CSV of your bills, see what's due, and print a clean one-page calendar. No accounts, no network, no data leaves your computer.

From [Asdale Dynamics, LLC](https://dylanasdale.github.io) — AI explained like a friend would, plus practical, tested tools.

## What it does

- **Month view** of every bill, read from a CSV with four columns: `name, amount, dueDay, autopay`
- **Highlights "this week"** — the whole Sunday-to-Saturday week is tinted, and a "Due by hand this week" list pulls out the non-autopay bills so you know exactly what needs attention
- **Autopay awareness** — autopay bills get a green ✔ chip and are kept out of the "to pay by hand" list, so you don't double-pay
- **Print** produces a one-page (letter, landscape) money calendar with the month, the total due, and the week's manual bills up top — sized to stick on the fridge
- **Zero dependencies** — plain HTML/CSS/JS. Open it and go.

## How to run it

No build step and no server needed.

1. Open `index.html` (double-click it, or `open index.html` / `xdg-open index.html`).
2. Click **Load sample** to try it out, or click **CSV:** to pick your own file (drag-and-drop works too).
3. Click **Print** when you want the fridge copy.

Optional: serve it statically if you prefer (`python3 -m http.server`), but it's not required.

### CSV format

```
name,amount,dueDay,autopay
Rent,1600,1,yes
Electricity,"142.37",15,no
Internet,$79.99,20,true
Coffee Club,5.00,10,0
```

- **amount**: plain number; `$`, commas, and quotes are all fine
- **dueDay**: 1–31. If a bill says 31 in a 30-day month, it lands on the last day of that month
- **autopay**: accepts `yes/no/true/false/y/n/1/0/x/on/autopay` (case-insensitive)
- Bad rows are skipped, good rows still load — a typo won't nuke the calendar
- Quoted fields with embedded commas are supported (`"Bill, Jr"`)

## Testing

A static test page ships with the app:

- **In the browser**: open `tests.html` — all tests run locally, pass/fail shown in a table (page title flips to PASS/FAIL for easy scripting)
- **From the terminal**: `node tests.cjs` runs the same suite (engine unit tests)
- `node smoke.cjs` exercises the actual rendering code with a stubbed DOM — month grid shape, bill chips, week highlighting, prev/next navigation

```bash
npm test      # runs node tests.cjs
node smoke.cjs
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The calendar app |
| `app.js` | Calendar engine (pure, testable — no DOM) |
| `ui.js` | Rendering and interaction |
| `styles.css` | Screen and print styles |
| `tests.html` / `tests.js` / `test-runner.js` | Static browser test page |
| `tests.cjs` / `smoke.cjs` | Terminal test runners |
| `sample-bills.csv` | Example data |

## Privacy

All processing happens in your browser after you pick the file. Nothing is uploaded — there is nowhere to upload it.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC.
