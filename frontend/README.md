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
| `src/lib/lumensplit.ts` | **The only data layer the UI uses.** Typed API: `connectWallet`, `createGroup`, `addExpense`, `settle`, `getGroup`, `getBalances`, `getExpenses`, `suggestSettlements`, `listMyGroups`. |
| `src/lib/mock.ts` | In-browser mock of the contract (same rules and error codes), persisted in localStorage. Seeds a demo group on first connect. |
| `src/lib/errors.ts` | Contract error codes → readable Spanish messages (`humanizeError`). |
| `src/lib/format.ts` | Amounts (`bigint`, 7 decimals), short addresses, stellar.expert links. |
| `src/lib/aliases.ts` | Local nicknames for addresses (never on-chain). |
| `src/pages/` | Home, NewGroup, GroupDetail, AddExpense, Settle. |
| `src/index.css` | Design tokens (`--color-brand-*`, `pos`, `neg`, `ink`). |

## Swapping the mock for the contract (person 1)

Keep the signatures in `src/lib/lumensplit.ts` and replace each `mock.*` call with the generated bindings in `src/contract/`:

- Amounts are `bigint` (i128), group ids `number` (u32), `Expense.timestamp` is a `number` in seconds (convert from u64 `bigint`).
- `getBalances` returns `Record<Address, bigint>` (convert from the contract `Map`).
- Write functions return `{ hash }` (and `createGroup` also `{ groupId }`). Call `opts?.onPhase?.('signing')` before asking Freighter to sign and `opts?.onPhase?.('submitting')` after, so the UI shows the right spinner.
- Throw errors as-is; `humanizeError` already understands `Error(Contract, #N)`.
- `listMyGroups(address)`: loop `group_count()` + `get_group(1..N)` and filter by `members`.
- Set `isMock = false` to hide the DEMO badge.
