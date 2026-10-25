# Demo runbook (video)

Everything below runs on **testnet**. Follow the steps in order and the numbers on screen will match.

## Before recording (Manu prepares, ~10 min)

1. A clean contract instance, so no test groups show up in the app.
2. `./scripts/demo-seed.sh` → group **"Lisbon trip"** (id 1) with Ana, Ben and Carla and 5 expenses.
3. Dani gets 500 EURT with `frontend/scripts/give-eurt.mjs`.
4. Names on every demo account (Ana, Ben, Carla, Dani) with `frontend/scripts/set-names.mjs`, so the app shows names and never asks "choose your name" during the take.
5. Alex receives the secret keys of **Ana, Ben and Dani** (testnet only) and imports them in Freighter.

## Before recording (Alex, 5 min)

- Freighter: network **Testnet**; accounts imported and renamed to Ana, Ben and Dani so the account switch reads well on video.
- `git pull`, `cd frontend`, `npm install`, `npm run dev`, open http://localhost:5173 in Chrome.
- Browser zoom 110–125%, hide bookmarks bar, close other tabs, do-not-disturb on.
- Do a full dry run once. If something breaks, ask Manu to reset (new contract + seed) before the real take.
- The app follows the account selected in Freighter automatically. After switching, wait ~1 s before clicking.

## The story and the expected numbers

| # | Who (Freighter) | Action | What the screen must show |
|---|---|---|---|
| 1 | Ana | Open **Lisbon trip** | 5 expenses. Balances: Ana **+43**, Ben **−59**, Carla **+16** |
| 2 | Ana | **Saldar cuentas** | Suggested: Ben → Ana **43**, Ben → Carla **16** (2 payments instead of 5 crossed debts) |
| 3 | Ben | **Saldar todo** → 1 signature | Two payments done in **one** transaction. Everyone at **0**. Open the stellar.expert link: both transfers inside the same tx |
| 4 | Ana | **Invitar amigos** → **Crear enlace** → sign | QR + link |
| 5 | Dani | Open the link → **Unirme al grupo** → sign | Dani in the group with balance **0** |
| 6 | Ana | **Añadir gasto** → *Wine tasting* → **Importes distintos**: Ana **10**, Dani **25** → sign | Ana **+25**, Dani **−25**, breakdown shown under the expense |
| 7 | Dani | **Saldar cuentas** → **Pagar en euros** | Quote **≈ 6.4 EURT** (EURT → XLM). Sign 1/2 (convert) and 2/2 (pay). Two stellar.expert links. Everyone at **0** |

Optional cut-in for step 5: scan the QR with a phone to show it's a real link (only works if the app is published).

## Talking points per step

- **1–2:** the ledger lives in a Soroban contract; the contract itself computes the fewest payments.
- **3:** one tap, one signature, all debts paid atomically: either every transfer happens or none.
- **4–5:** no copying wallet addresses. The link carries a secret; only its hash is on-chain.
- **6:** not every split is equal.
- **7:** Dani only has euros. Stellar's built-in AMM converts them on the fly and Ana receives exactly 25 XLM, in seconds, for a fraction of a cent.

## If something goes wrong

- *"Ya eres miembro"* when it shouldn't: check the account at the top right matches Freighter.
- *Price moved* on step 7: press the button again (new quote).
- Any other error: copy the message and the browser console (Cmd + Option + J) to Manu.
