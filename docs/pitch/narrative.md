# LumenSplit · pitch narrative

One-liner: **Split bills with friends and settle up in seconds, from any country, for a fraction of a cent.**

## 1. Problem
- Shared expenses are everywhere: trips, shared flats, Erasmus semesters.
- Apps like Splitwise or Tricount only *track* who owes what. The actual payback happens elsewhere ("I'll Bizum you later"), and often never happens.
- Across borders it is worse: an international student in Lisbon paying back a friend in Germany or Brazil faces slow transfers, FX spreads and fees that can exceed the debt itself.
- Result: small debts linger, someone always ends up out of pocket, friendships get awkward.

## 2. Solution
LumenSplit is a bill-splitting app where **tracking and paying live in the same place**.
- Create a group, add expenses, see who owes whom (green = you're owed, red = you owe).
- Tap **Settle up**: LumenSplit computes the fewest payments needed to clear the group.
- Tap **Pay**: real money moves on Stellar in ~5 seconds, and the shared ledger updates instantly.
- The group's record lives in a Soroban smart contract: nobody can edit history, and every payment has a public receipt.

## 3. Why Stellar
- **Instant and nearly free**: ~5 s finality, fees of ~0.00001 XLM. Paying back 3 € finally makes sense.
- **Stablecoins**: groups can settle in USDC, so nobody is exposed to volatility.
- **Native assets + Stellar Asset Contracts**: the contract moves real tokens with `transfer`, no wrapping.
- **Path payments and anchors** (roadmap): pay in your currency, the friend receives theirs, cash out to a bank.

## 4. What's different
- **On-chain debt simplification**: `suggest_settlements` turns a tangle of debts into the minimum list of payments, computed by the contract itself, so everyone sees the same answer.
- **One-tap real settlement**: `settle` only lets you pay what you actually owe to someone who is actually owed. No overpaying, no mistakes.
- **Zero crypto jargon in the UI**: amounts, names and "Pay". The wallet is the only sign that it runs on a blockchain.

## 5. How it works
React web app → Freighter wallet signs → Soroban contract `lumensplit` on testnet → token transfer (XLM/USDC SAC).
Contract API: `create_group`, `add_expense`, `settle`, `suggest_settlements`, plus read-only views. 7 unit tests pass.

## 6. Market
- ~1.5 M international students in Europe each year (Erasmus+ alone ~1.3 M participants/year*), plus digital nomads and travel groups.
- Shared-flat renters and travellers already use Splitwise/Tricount (tens of millions of users): LumenSplit adds the missing step, the payment.
- Entry wedge: international student groups, where cross-border payback hurts most.
- Business model (later): small fee on cross-currency settlements via path payments; premium groups (recurring bills, receipts export).

\* verify figures before putting them on a slide.

## 7. Roadmap
1. **Now (hackathon)**: groups, expenses, balances, minimal settlements and real payment on testnet.
2. **Next**: pay in your own currency with path payments (EUR → USDC → XLM).
3. **Then**: cash out to a bank account via Stellar anchors (SEP-24), invite friends by link, recurring expenses.
4. **Later**: mainnet, mobile app, passkey wallets so friends don't need to install anything.

## 8. Team
- Manu: Soroban contract, deployment and integration.
- (Persona 2): frontend.
- Alex: design/UX, pitch and demo.
Built at HackMeridian, Lisbon, 25–26 Oct 2026. AI assistance: Claude (see README).

## Demo storyline (for the 2–3 min video)
1. Hook (10 s): "Last summer four of us went to Lisbon. Three months later, Ben still owed me 22 euros."
2. Connect Freighter → create "Lisbon trip" with Ben and Carla.
3. Add 3 expenses: dinner, Airbnb, tuk-tuk.
4. Group detail: big green/red balances.
5. Settle up: tangle collapses into 2 payments.
6. Pay: Freighter pops up, ~5 s later the toast shows time and fee.
7. Open Stellar Expert: the real transaction on-chain.
8. Close (15 s): Why Stellar + roadmap + "Split bills. Settle in seconds."
