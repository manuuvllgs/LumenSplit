# LumenSplit

Split group expenses among friends and settle debts on Stellar.

## Contract (Soroban)

| Function | What it does |
|---|---|
| `create_group(creator, name, token, members)` | Creates a group; `token` is the settlement asset (USDC or XLM SAC) |
| `add_expense(group_id, payer, amount, description, participants)` | Records an expense split equally; ledger always sums to zero |
| `settle(group_id, from, to, amount)` | Moves real tokens from debtor to creditor and updates the ledger |
| `suggest_settlements(group_id)` | Debt simplification: minimal list of transfers to clear the group |
| `get_group` / `get_balances` / `get_expenses` / `group_count` | Read-only views |

Positive balance = owed money. Negative balance = owes money.

## Build, test, deploy

```bash
cargo test
stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/lumensplit.wasm \
  --source dev --network testnet --alias lumensplit
```
