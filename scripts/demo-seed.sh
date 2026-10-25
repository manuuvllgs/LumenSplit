#!/usr/bin/env bash
# Seeds a realistic demo group on testnet for the LumenSplit video.
# Usage: ./scripts/demo-seed.sh [contract-alias-or-id]
# Requires identities ana, ben, carla created with:
#   stellar keys generate <name> --network testnet --fund
set -euo pipefail

CONTRACT="${1:-lumensplit}"
NET="--network testnet"
XLM=$(stellar contract id asset --asset native --network testnet)
ANA=$(stellar keys address ana)
BEN=$(stellar keys address ben)
CARLA=$(stellar keys address carla)
ALL="[\"$ANA\",\"$BEN\",\"$CARLA\"]"

invoke() { # $1 = signer, rest = function + args
  local who="$1"; shift
  stellar contract invoke --id "$CONTRACT" --source "$who" $NET -- "$@"
}

# XLM has 7 decimals: 1 XLM = 10000000
xlm() { python3 -c "print(int(round($1 * 10**7)))"; }

echo "Creating group…"
GID=$(invoke ana create_group --creator "$ANA" --name "Lisbon trip" --token "$XLM" --members "$ALL" | tr -d '"')
echo "Group id: $GID"

expense() { # payer amount description participants
  echo "  + $3 ($2 XLM) paid by $1"
  invoke "$1" add_expense --group_id "$GID" --payer "$(stellar keys address "$1")" \
    --amount "$(xlm "$2")" --description "$3" --participants "$4" >/dev/null
}

expense ana   90  "Dinner at Time Out Market"  "$ALL"
expense ben   24  "Uber from the airport"      "$ALL"
expense carla 45  "Oceanário tickets"           "$ALL"
expense ana   12  "Pastéis de nata"             "[\"$ANA\",\"$CARLA\"]"
expense carla 60  "Fado night"                  "[\"$BEN\",\"$CARLA\"]"

# Expected: ana +43, ben -59, carla +16  ->  ben pays ana 43 and carla 16
echo
echo "Balances (stroops):"
invoke ana get_balances --group_id "$GID"
echo
echo "Suggested settlements:"
invoke ana suggest_settlements --group_id "$GID"
echo
echo "Done. Use group $GID in the app."
echo "  ana   = $ANA"
echo "  ben   = $BEN"
echo "  carla = $CARLA"
