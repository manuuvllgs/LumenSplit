#!/usr/bin/env bash
# Downloads the female voice-over (ElevenLabs "Hope", generated with Creative Claw) into public/voice/.
set -euo pipefail
cd "$(dirname "$0")/.."
B=https://cdn.creativeclaw.co/u/acaf4c78/audio
i=1
for id in 8d29994b-27c2-47fc-87c6-020fc77feb6c 116db8c6-3c08-44a7-96c7-993cf6adda0f 372233fb-ab2e-4802-b333-924c2b1f35f0 \
          247cfaaf-1710-449f-97ae-2e8151b54b9c a3292c6b-279a-4b02-b8c9-43878f0dfebd fe8a8890-4cb3-46fd-b6c9-2abedb9fe22b \
          8375fae1-3e70-4fee-886a-d51539d4de71 62251462-3f68-4c7f-8275-deaa19bd4b3c e6850fde-1d72-4e04-a453-3b2bd805109a; do
  curl -sSfL -o "public/voice/0$i.mp3" "$B/$id.mp3" && echo "✓ 0$i.mp3"
  i=$((i+1))
done
