# Lab Exam Queue Budget Simulator

A browser-based decision-support tool for the Municipal Health Department of Uberaba (Brazil). It answers one question: **given a budget, which patients waiting for lab tests can be fully served, and what is still missing?**

**Live app:** https://noodlelds.github.io/orcamento-exames/

## The problem

The municipal e-queue system exports one PDF report per lab test (CBC, TSH, HbA1c, lipid panel, and so on), each listing every patient waiting for it. A single patient can appear in a dozen of these reports.

Planning a purchase means answering questions the reports can't answer on their own:

- How much does it cost to clear the whole queue?
- With R$ 1M, how many patients get **all** of their pending tests? Who is left out, and how much would it take to cover them?
- What changes if we prioritize the elderly, the longest-waiting patients, or only some of the tests?

## Features

- **Reads the official PDF reports directly.** Load all reports at once. Each one is checked against its declared patient total, so you can see that nothing was lost in parsing.
- **Builds each patient's package.** Rows are merged by medical record number into one set of pending tests per patient.
- **All-or-nothing eligibility.** A patient qualifies only if every one of their pending tests is among the tests selected for funding. Nobody is half-served.
- **Adjustable rules.** Age range, queue-entry date range, requested-date cutoff, priority age bands, sort order (by wait time or age, in either direction), and budget behavior when the next patient doesn't fit.
- **Live results.** Patients served, budget used, the shortfall or surplus against the cost of serving everyone eligible, plus charts by age band, by month of queue entry, and by test.
- **Overview tab.** Patients and tests waiting per test type, and the cost to clear each queue.
- **Excel export.** Scenario parameters, the served list, and the not-served list.
- **Consolidated base file.** Save every parsed report as one `.xlsx` that reopens in seconds instead of re-reading thousands of PDF pages.
- **Editable price table.** Defaults to the CISALP consortium contract prices. Tests outside that contract use 2× the SUS reference value (SIGTAP).

## Privacy by design

The reports contain names and national health card numbers, so the app has **no backend**:

- Files are parsed **in the user's browser**. No patient data is uploaded, stored on a server, or kept in browser storage.
- Only the price table is persisted (`localStorage`).
- The repository contains code only. `.gitignore` blocks PDF, XLSX and CSV files.

## How the simulation works

1. **Group.** Rows from all reports are joined by medical record number. A patient's queue-entry date is the earliest across their tests.
2. **Filter.** A patient is eligible only if their whole package is covered by the selected tests and they pass the age and date filters. Optionally, the app can also require the full request to be covered: each report states the request's total procedure count, and procedures missing from the loaded lists are flagged.
3. **Prioritize.** Priority age bands come first, if any are set. Then patients are sorted by queue-entry date and age, in the chosen order and direction.
4. **Allocate.** The app walks the sorted list, adding each patient's full package cost. By default it stops at the first patient who doesn't fit, which preserves the priority order. It can also skip that patient and keep filling.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript, Vite |
| PDF parsing | pdf.js (text items with coordinates; column detection by x position) |
| Spreadsheets | SheetJS (export and consolidated base) |
| Tests | Vitest |
| Hosting | GitHub Pages via GitHub Actions |

The domain logic lives in `src/core/`. These are pure functions with no React or browser dependency, unit-tested, and reusable on a server if one is ever needed.

```
src/
  core/
    parseRelatorio.ts   # PDF text items -> typed rows (pure)
    pacientes.ts        # group by medical record, package cost
    simulacao.ts        # eligibility, filters, priority, budget allocation
    exames.ts           # canonical test names
    precos.ts           # default price table (CISALP / SIGTAP x2)
  lib/                  # pdf.js loader, formatting, Excel import/export
  ui/                   # charts, animated numbers
scripts/
  parse-node.ts         # run the same parser in Node against real PDFs
  gerar-base.ts         # build the consolidated base and verify round-trip
  e2e.mjs               # Playwright end-to-end check against real reports
```

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests
npm run build        # production build in dist/
```

To check the parser against a folder of reports without opening the browser:

```bash
npx tsx scripts/parse-node.ts ./reports parsed.json
```

## Validation

The parser and the simulation were checked against the real reports of 19 Oct 2026 (29 tests):

- Every report matched its declared total: 164,288 rows from 13,842 patients.
- Browser results matched an independent Node run of the same logic.
- The consolidated base round-trips with identical data.

## Deployment

Every push to `main` runs the tests, builds the app, and publishes it to GitHub Pages. To enable this on a fork: **Settings → Pages → Source: GitHub Actions**.

## Notes

- Interface and domain code are in Brazilian Portuguese, matching the users and the source system.
- Prices are planning estimates, not contract values. Confirm them before any official decision.

## Author

Lucas Oliveira ([@NoodleLDS](https://github.com/NoodleLDS)), registered nurse and software developer.
