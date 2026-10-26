# LumenSplit · demo video

Remotion project for the HackMeridian demo (1920×1080, 30 fps, ~2:50).

| # | Scene | Source | Length |
|---|-------|--------|--------|
| 1 | Problem | animated | 20 s |
| 2 | Balances (Ana) | `public/clips/balances.mp4` | 20 s |
| 3 | Settle all (Ben) | `public/clips/settle-all.mp4` | 20 s |
| 4 | Invite (Ana) | `public/clips/invite.mp4` | 15 s |
| 5 | Join (Dani) | `public/clips/join.mp4` | 15 s |
| 6 | Custom amounts (Ana) | `public/clips/expense-custom.mp4` | 20 s |
| 7 | Pay in euros (Dani) | `public/clips/pay-euros.mp4` | 25 s |
| + | Passkeys + dark mode (desktop) | `public/clips/passkey.mp4` | 25 s |
| 8 | Close | animated | 15 s |

## Use

```bash
cd video
npm install
npx remotion studio        # preview; scenes without a clip show what to record
```

1. **Clips:** drop the screen recordings into `public/clips/` with the names above (16:9). They play muted.
2. **Fit each clip to its slot:** in `src/config.ts` set `trimBeforeSeconds` (skip the start) and `playbackRate` (e.g. `1.5` to speed up a long recording).
3. **Voice:** `npm run voice` downloads the female English voice-over (ElevenLabs, generated with Creative Claw) into `public/voice/` (`01.mp3` … `09.mp3`). Captions are synced to it via the `cues` in `src/config.ts`. `npm run voice:say` makes a fallback with macOS `say`.
4. **Render:** `npm run render` → `out/lumensplit-demo.mp4`.

Captions are the voice-over lines from `src/config.ts`, shown one sentence at a time.
