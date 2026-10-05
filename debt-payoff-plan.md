# Debt payoff tab (snowball / avalanche)

## Context

Pyenancial currently has three tabs — Plan, Mortgage, Retirement — each following the same shape:
a shared `baseInputs`/`answers` draft (`useDraftState`), a dedicated `lib/*.ts` module for the math,
and a page component with sidebar inputs + chart + breakdown table. Mortgage and Retirement both
show an empty/gated state until a relevant condition is true (`ownsHome`, first-visit retirement
questionnaire).

The user wants a new **Debt** tab to visualize payoff of high-interest, non-mortgage debt (credit
cards, personal/auto/student loans) across **N user-entered debts**, comparing the **snowball**
(smallest balance first) and **avalanche** (highest rate first) strategies. Debts should be the
main focus of the page, laid out like the Plan tab's **Goals** cards (not sidebar sliders). Entry
happens on the Debt tab itself, not through the onboarding questionnaire's field-by-field flow —
the questionnaire only gets one new gating question ("Do you have debt outside your mortgage?").

Clarified decisions (from user):
- **One rolled-up value feeds `runModel`.** Per-debt detail (balance/APR/min payment per debt) stays
  local to the Debt tab, but the *total monthly amount actually being paid toward debt* each year —
  minimums still owed plus the extra budget/rollover from the chosen strategy, dropping to $0 once
  everything's paid off — subtracts from the Plan tab's monthly cash flow, same as `housingCost`/
  `purchaseCosts` already do. This directly reduces `freeCash`, which is what funds goals/savings via
  `advanceUnallocatedPool` — so debt payments now work against savings goals, same as the user asked.
- **Debts are cards, not sidebar fields.** Visually like Goals: a card per debt next to the chart,
  with an "Add debt" card, not a repeatable questionnaire step.
- **Gating**: one boolean question added to the primary questionnaire's "Getting started" section
  (`hasDebt`). Like Mortgage's `ownsHome`, this is *also* a persistent, always-visible toggle on the
  Debt tab itself (not a one-time-only answer) — so a user can turn debt tracking on/off directly
  from the tab, the same reasoning `HousingToggle`'s own comment gives for why `ownsHome` is a real
  control and not just an onboarding answer.

## Data model

**`src/lib/debts.ts`** (new) — mirrors `src/lib/goals.ts`'s id/validation conventions:
```ts
export interface Debt {
  id: string;
  name: string;        // e.g. "Visa card" — free text, editable like Goal.name
  balance: number;      // dollars, not K — consistent with Goal.monthlyAmount/targetAmount
  aprPct: number;        // annual percentage rate
  minPayment: number;    // dollars/month
}
```
- `generateDebtId()` — same `crypto.randomUUID()` + fallback-counter pattern as `generateGoalId`/`generateBreakpointId`.
- `isValidDebt(value): value is Debt` — same shape as `isValidGoal`/`isValidBreakpoint` (non-empty id/name, finite non-negative balance/aprPct/minPayment).
- `createDebt(id): Debt` — single default-shape constructor (name "New debt", balance 5000, aprPct 20, minPayment 100) for the "Add debt" card. No catalog/category branching needed — unlike `GOAL_CATALOG`, every debt has the same shape, so no picker modal.

**`src/lib/debtPayoff.ts`** (new) — the payoff engine:
```ts
export type DebtPayoffStrategy = 'snowball' | 'avalanche';

export interface DebtPayoffYearPoint {
  year: number;                       // 0 = today, same convention as mortgage.ts
  totalBalance: number;
  interestPaid: number;               // this year, summed across debts
  /** Total monthly amount going toward debt as of this year-end: minimums on still-active debts +
   *  extra budget/rollover (0 once every debt is paid off). Same "point-in-time nominal payment"
   *  convention as AmortizationYearPoint.monthlyPaymentNominal in mortgage.ts - this is what
   *  runModel reads per-year to subtract from cash flow (see "Model integration" below). */
  monthlyPaymentNominal: number;
}

export interface DebtPayoffSchedule {
  points: DebtPayoffYearPoint[];
  payoffMonthByDebtId: Record<string, number>;
  totalPayoffMonths: number;
  totalInterestPaid: number;
  /** true if some debt's minPayment doesn't cover its monthly interest, so it never pays off within
   *  the simulation cap (MAX_MONTHS) — surfaced as a warning, same spirit as RetirementPage's
   *  earlyWithdrawalWarning. */
  stalled: boolean;
}

export function orderDebtsForStrategy(debts: Debt[], strategy: DebtPayoffStrategy): Debt[];
export function buildDebtPayoffSchedule(debts: Debt[], strategy: DebtPayoffStrategy, extraMonthlyBudget: number): DebtPayoffSchedule;
```
- Order is fixed once at month 0 from starting balances/rates (snowball = balance ascending,
  avalanche = aprPct descending, tie-break by balance ascending) — standard definition; debts are
  not re-ranked monthly as balances change.
- Monthly simulation (mirrors `buildAmortizationSchedule`'s month-then-bucket-into-years approach in
  `mortgage.ts`): accrue interest on every active debt, pay each its minimum, then apply
  `extraMonthlyBudget` **plus every already-paid-off debt's former minimum payment** ("the snowball")
  to the highest-priority debt still owing, cascading any leftover to the next debt the same month.
  Cap at `MAX_MONTHS = 600` (50yr) to avoid an infinite loop when minimums don't cover interest; set
  `stalled: true` if the cap is hit with balance remaining.
- Two schedules get built per render, same comparison pattern as Mortgage's `originalSchedule` vs
  `withExtraSchedule`: **minimum-payments-only** (`extraMonthlyBudget: 0`, and critically *no*
  snowball rollover — a freed-up minimum just stops, isn't redirected) vs **with-strategy** (entered
  budget, with rollover). This is what the chart/table compare.
- Reuse `formatPayoffDate` from `mortgage.ts` as-is.

## Model integration (`src/lib/model.ts`)

- `ModelInputs` gains `debtPayoff: { debts: Debt[]; strategy: DebtPayoffStrategy; extraMonthlyBudget: number }` (empty `debts: []` when `hasDebt(answers)` is false — App.tsx passes `[]` rather than teaching `model.ts` about the toggle, same pattern `ownsHome: boolean` already uses to gate housing math instead of threading `answers` through).
- `runModel` builds the with-strategy schedule once via `buildDebtPayoffSchedule(debts, strategy, extraMonthlyBudget)` (imported from `lib/debtPayoff.ts`, same place `monthlyMortgagePayment` is already imported from for housing) and derives `debtPaymentByYear: number[] = schedule.points.map(p => p.monthlyPaymentNominal)`, zero-padded/clamped to `HORIZON_YEARS` (reuse `padToLength`-equivalent logic — if debts finish before year 18, remaining years are $0; if they run past, clamp to the last available point, same clamping convention `advanceGoalBalances`'s endYear freeze and the inspect-year sliders elsewhere already use).
- Add `debtPaymentByYear` to `YearContext`; `computeYearFigures` adds a `debtCost = ctx.debtPaymentByYear[Math.min(year, ctx.debtPaymentByYear.length - 1)]` term into `totalExpenses` (alongside `housingCost`/`purchaseCosts`), which flows into `freeCash = income - totalExpenses - goalTotal` unchanged otherwise.
- Add `debtCost` to `YearFigures` and `YearSnapshot` so the breakdown table can show it.
- `src/components/results/BreakdownTable.tsx`: add a `{snapshot.debtCost > 0 && <Row label="Debt payments" value={formatCurrency(snapshot.debtCost)} muted />}` row next to the existing `purchaseCosts` row, same conditional-row pattern.
- `src/App.tsx`'s `result = useMemo(...)`: build `debtPayoff` from `draft.debts`/`debtPayoffStrategy(draft.answers)`/`draft.baseInputs.debtExtraPaymentMo`, gated by `hasDebt(draft.answers) ? draft.debts : []`, and add it to the `runModel` call + the `useMemo` dependency array.

## Plan / draft wiring

**`src/lib/plans.ts`**:
- `Plan.debts: Debt[]` — new field.
- `freshPlan()`: `debts: []`.
- `isValidPlan`: optional-with-default, same treatment as `onboardingComplete` — `if (plan.debts !== undefined && (!Array.isArray(plan.debts) || !plan.debts.every(isValidDebt))) return false;` so a pre-existing saved plan without this field still validates.
- `loadSavedPlan`: backfill `debts: plan.debts ?? []`.

**`src/hooks/useDraftState.ts`**:
- `loadDraft`: filter `record.debts` through `isValidDebt`, same as `goals`/`children`.
- New actions: `addDebt(debt: Debt)`, `removeDebt(id: string)`, `updateDebt(id: string, patch: Partial<Omit<Debt, 'id'>>)` — same shape as `addGoal`/`removeGoal`/`updateGoal` (no `sanitizeGoal`-style cross-field invariant needed; sliders already clamp ranges).
- Expose `debts`, `addDebt`, `removeDebt`, `updateDebt` on the returned object + interface.

**`src/lib/questions.ts`**:
- `hasDebt(answers): boolean` — defaults to `false`, same style as `hasPartnerIncome`/`hasKids`.

**`src/lib/questionnaire.ts`**:
- Add a 4th `GatingQuestion` to `GETTING_STARTED_QUESTIONS`: `hasDebt`, boolean, prompt "Do you have any debt outside your mortgage?", explanation noting credit cards/personal/auto/student loans, used only to pre-set the Debt tab's toggle — no repeatable step, no new questionnaire section (per the clarified scope).

## New Debt-tab-only base fields

Like `MORTGAGE_DETAILS_GROUP`/`EXTRA_PAYMENTS_GROUP`, these are **not** added to `BASE_FIELD_GROUPS`
(so they never appear on the Plan tab or in the primary questionnaire) — standalone exports in
`src/lib/baseFields.tsx` used only by the Debt page's own sidebar:
- `DEBT_EXTRA_PAYMENT_FIELD` (`debtExtraPaymentMo`, $/mo, default 0) — the pooled extra budget thrown at the strategy target each month.
- `DEBT_INSPECT_YEAR_FIELD` (`debtInspectYear`) — same inspect-year slider pattern as `MORTGAGE_INSPECT_YEAR_FIELD`/`RETIREMENT_INSPECT_AGE_FIELD`.
- `DEBT_PAYOFF_GROUP: BaseFieldGroup` bundling just `DEBT_EXTRA_PAYMENT_FIELD`.
- `src/data/Defaults.json` / `src/lib/baseData.ts`: add `debtExtraPaymentMo` (default 0, range e.g. 0–2000 step 25) and `debtInspectYear` (default 0) to `BaseInputs`/`DEFAULT_BASE_RANGES`, same as every other field there.

Strategy choice (`snowball`/`avalanche`) is stored as an `Answer` (like `filingStatus`), not a
baseInput: `debtPayoffStrategy(answers): DebtPayoffStrategy` in `questions.ts`, defaulting to
`'avalanche'` (minimizes interest, matching "high interest debt" framing), set via `onAnswer`.

## Components (new `src/components/debt/`)

- **`DebtPage.tsx`** — top-level page, same `app-shell` shape as `MortgagePage.tsx`:
  - Always renders a `DebtToggle` (persistent on/off, styled like `HousingToggle.tsx`) reading/writing `hasDebt`/`onAnswer('hasDebt', …)`.
  - If `!hasDebt(answers)`: empty-state copy below the toggle (no redirect needed, since the toggle is right there) — mirrors `MortgagePage`'s `!owns` branch. Debts already entered stay in the draft untouched (same as flipping `ownsHome` never discards mortgage fields); they just stop rendering here *and* stop affecting `runModel`, since App.tsx passes `[]` for `debtPayoff.debts` whenever `hasDebt` is false.
  - Else: sidebar with `DebtStrategyToggle` (snowball/avalanche, two-button `chart-toggle` style like `FilingStatusToggle.tsx`) + `ControlGroup` for `DEBT_PAYOFF_GROUP`; main area with `DebtPayoffChart`, the debt cards list (`DebtCard` + `AddDebtCard`), inspect-year slider, `MetricCards`, and `DebtPayoffTable`.
- **`DebtToggle.tsx`** — boolean toggle, copy of `HousingToggle.tsx`'s shape (two-button `chart-toggle`, "Tracking debt" / "No debt").
- **`DebtStrategyToggle.tsx`** — copy of `FilingStatusToggle.tsx`'s shape for snowball/avalanche.
- **`DebtCard.tsx`** — copy of `GoalCard.tsx`'s collapse/expand + inline-rename shell, with `Slider`s for balance/aprPct/minPayment (fixed ranges, e.g. balance 0–50000/step 100, aprPct 0–30/step 0.1, minPayment 0–2000/step 10) and a payoff-order/payoff-date badge sourced from the with-strategy schedule's `payoffMonthByDebtId`.
- **`AddDebtCard.tsx`** — copy of `AddGoalCard.tsx`'s idle "+ Add new" button, but calls `createDebt` directly (no catalog picker, since there's only one debt shape).
- **`DebtPayoffChart.tsx`** — copy of `MortgageChart.tsx`'s two-line (minimum-only vs with-strategy) balance-over-time chart, fed `points.map(p => p.totalBalance)` from each schedule, padded to equal length with `padToLength` (promote that helper from `MortgagePage.tsx` to a shared location, e.g. `lib/format.ts` or a new tiny `lib/chartUtil.ts`, since both Mortgage and Debt pages need it).
- **`DebtPayoffTable.tsx`** — copy of `BreakdownTable.tsx`'s `Row` reuse: per-debt rows (name, balance, aprPct, minPayment, payoff order, payoff date, interest paid) plus totals (total interest minimum-only vs with-strategy, interest saved, months saved) — same `Row`/`breakdown-table` CSS classes Mortgage/Plan tabs already use.

## App wiring (`src/App.tsx`)

- `PageTab` union: add `'debt'`.
- Nav: add a `Debt` tab item next to Mortgage/Retirement (`tabClassName('debt', activeTab)`).
- Pull `debts`, `addDebt`, `removeDebt`, `updateDebt` off `draft`.
- New branch: `else if (activeTab === 'debt') { <DebtPage debts={draft.debts} onAdd={draft.addDebt} onRemove={draft.removeDebt} onUpdate={draft.updateDebt} baseInputs={draft.baseInputs} ranges={DEFAULT_BASE_RANGES} onChange={draft.setBaseInput} answers={draft.answers} onAnswer={draft.setAnswer} /> }`.

## Styling

Add debt-specific classes to `src/index.css` only where the shape genuinely differs from Goals
(e.g. `.debt-card` payoff-order badge); otherwise reuse `.goal-card`/`.add-goal-card`/`.app-shell`/
`.breakdown-table` classes as-is, same reuse-first approach the existing tabs already take.

## Verification

- Unit tests (new, alongside existing `tests/` conventions):
  - `debtPayoff.test.ts`: snowball orders smallest-balance-first, avalanche orders highest-rate-first; rollover mechanic (a paid-off debt's minimum compounds onto the next target); minimum-only schedule never rolls over; `stalled` flag when a minPayment can't cover interest; total interest with-strategy ≤ minimum-only for the same debt set; `monthlyPaymentNominal` drops to 0 once every debt is paid off.
  - `debts.test.ts`: `isValidDebt` rejects negative/non-finite fields, missing id/name.
  - `plans.test.ts` additions: `isValidPlan` still accepts a plan missing `debts` (grandfathering).
  - `model.test.ts` additions: `runModel` with a nonzero debt payment reduces `freeCash`/`unallocatedAtEnd` vs. the same inputs with `debtPayoff.debts: []`; the reduction disappears in years after the debt schedule's payoff point.
- Run `npm test` (existing Jest config) before considering any step done, per repo convention.
- Manual pass in-browser: toggle debt on, add 2–3 debts with different balances/rates, switch
  snowball ↔ avalanche, confirm the chart/table update and payoff dates make sense, and confirm the
  Plan tab's free cash / breakdown table drops by the expected monthly amount and recovers once the
  debts are projected to be paid off; toggle off and confirm the Debt tab returns to its empty state
  *and* the Plan tab's free cash recovers immediately, without losing the entered debts (same
  "toggle doesn't discard data" behavior `HousingToggle` already has for `ownsHome`).

## Build order

1. `lib/debts.ts` + `lib/debtPayoff.ts` + their tests (pure logic, no UI).
2. `plans.ts` + `useDraftState.ts` wiring (`debts` field/actions).
3. `questions.ts`/`questionnaire.ts` gating question + `debtPayoffStrategy` helper.
4. `baseFields.tsx`/`Defaults.json`/`baseData.ts` new fields.
5. `model.ts` + `BreakdownTable.tsx` integration + their tests.
6. Components (`DebtToggle` → `DebtStrategyToggle` → `DebtCard`/`AddDebtCard` → `DebtPayoffChart`/`DebtPayoffTable` → `DebtPage`).
7. `App.tsx` wiring + nav tab + `result` useMemo update.
8. Manual verification in-browser + `npm test`.
