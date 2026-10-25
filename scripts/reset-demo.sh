#!/usr/bin/env bash
# Fresh contract instance + demo data for the video. Run from the repo root:
#   ./scripts/reset-demo.sh
# Optional: ISSUER_SECRET=S... to top up Dani with 500 EURT.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/4 Building contract…"
stellar contract build >/dev/null 2>&1

echo "2/4 Deploying a fresh instance…"
OLD=$(grep '^VITE_CONTRACT_ID=' frontend/.env | cut -d= -f2)
NEW=$(stellar contract deploy --wasm target/wasm32v1-none/release/lumensplit.wasm \
  --source ben --network testnet --alias lumensplit 2>/dev/null | tail -1)
[[ "$NEW" =~ ^C[A-Z2-7]{55}$ ]] || { echo "Deploy failed: $NEW"; exit 1; }
sed -i '' "s/$OLD/$NEW/g" frontend/.env frontend/.env.example README.md
echo "    $OLD -> $NEW"

echo "3/4 Seeding \"Lisbon trip\"…"
./scripts/demo-seed.sh 2>/dev/null | grep -E "Group id|^\{|^\[" || true

if [[ -n "${ISSUER_SECRET:-}" ]]; then
  echo "4/4 Topping up Dani with EURT…"
  (cd frontend && USER_SECRET=$(stellar keys show dani) node scripts/give-eurt.mjs)
else
  echo "4/4 Skipped EURT top-up (set ISSUER_SECRET to enable)"
fi

echo
echo "Done. New contract: $NEW"
echo "Next: git add frontend/.env.example README.md && git commit -m 'chore: reset demo contract' && git push"
echo "Tell Alex to set VITE_CONTRACT_ID=$NEW in frontend/.env and restart npm run dev."
