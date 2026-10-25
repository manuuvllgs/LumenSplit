# LumenSplit — frontend

Vite + React + TypeScript + Tailwind v4. Wallet: Freighter (testnet).

```bash
npm install
cp .env.example .env   # fill VITE_CONTRACT_ID / VITE_TOKEN_ID
npm run dev            # http://localhost:5173
```

## Structure

| Path | What |
|---|---|
| `src/lib/lumensplit.ts` | **The only data layer the UI uses.** Picks `soroban.ts` (real) or `mock.ts`. Typed API: `connectWallet`, `createGroup`, `addExpense`, `settle`, `getGroup`, `getBalances`, `getExpenses`, `suggestSettlements`, `listMyGroups`. |
| `src/lib/soroban.ts` | Real implementation against the deployed contract + Freighter signing. |
| `src/lib/mock.ts` | In-browser mock of the contract (same rules and error codes), persisted in localStorage. Seeds a demo group on first connect. |
| `src/lib/errors.ts` | Contract error codes → readable Spanish messages (`humanizeError`). |
| `src/lib/format.ts` | Amounts (`bigint`, 7 decimals), short addresses, stellar.expert links. |
| `src/lib/aliases.ts` | Local nicknames for addresses (never on-chain). |
| `src/pages/` | Home, NewGroup, GroupDetail, AddExpense, Settle. |
| `src/index.css` | Design tokens (`--color-brand-*`, `pos`, `neg`, `ink`). |

## Contract vs mock

- With `VITE_CONTRACT_ID` set, `src/lib/soroban.ts` talks to the deployed contract. It uses `contract.Client.from()` from `@stellar/stellar-sdk`, which downloads the contract spec from testnet, so there's no need for the `stellar` CLI or generated bindings.
- Reads are simulations and need no signature. Writes are simulated first, so contract errors show up before Freighter opens, then signed with Freighter and sent.
- Contract errors are read from the simulation (`Error(Contract, #N)`) and translated in `src/lib/errors.ts`.
- Leave `VITE_CONTRACT_ID` empty, or set `VITE_USE_MOCK=true`, to use in-browser demo data. A DEMO badge shows in the header.
- `listMyGroups` loops `group_count()` + `get_group(1..N)` and filters by member.

Testing with Freighter: switch it to **Testnet** and fund each account with Friendbot (`https://friendbot.stellar.org/?addr=G...`).
