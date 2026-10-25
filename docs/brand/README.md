# LumenSplit · brand

![logo](logo.svg)

## Logo
The mark is a **coin split in two by a ray of light**, in ink on a **HackMeridian-gold tile**. It uses fixed colours, so it reads the same on light and dark backgrounds.

- `logo.svg`: horizontal logo (mark + wordmark) for light backgrounds.
- `logo-dark.svg`: horizontal logo for dark backgrounds.
- `logo-mark.svg` / `favicon.svg`: the mark alone, as a rounded gold tile.
- App icons (PWA): [`../../frontend/public/`](../../frontend/public/) → `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (logo inside the safe zone for Android masks) and `apple-touch-icon.png`.

In the app, the mark is the `LogoMark` component in [`frontend/src/components/Logo.tsx`](../../frontend/src/components/Logo.tsx).

## Colours (Dusk × HackMeridian)
| Token | Value | Use |
|---|---|---|
| Gold | `#fdda24` | HackMeridian's gold. The logo tile and the one action that moves money (Pay, Settle all) |
| Ink | `#0f0f0f` | Text and the coin in the logo |
| Bone | `#f6f4ef` | Light background |
| Slate | `#14161f` | Balance card, footer, dark mode background |
| Periwinkle | `oklch(46% 0.14 274)` | Selection, links, info |
| Positive / Negative | `oklch(50% 0.12 155)` / `oklch(53% 0.18 27)` | You are owed / You owe |

The full token set (light and dark) lives in [`frontend/src/index.css`](../../frontend/src/index.css).

## Typography
- **Wix Madefor Display**: headings and amounts.
- **Wix Madefor Text**: body text.
- **Archivo Narrow** 600: buttons and controls.
- **IBM Plex Mono**: Stellar keys and hashes.

## Copy rules (no crypto jargon)
- "Settle up", "Pay", "You owe", "You are owed". Never "transaction", "invoke", "sign", "i128".
- Amounts big, 2 decimals, currency next to them, with the approximate value in euros.
- Addresses shortened (`GA7Q…K3PD`) and replaced by the person's chosen name whenever we have one.
- After a payment, show how long it took, plus a link to Stellar Expert.

> The PNGs in [`../wireframes/`](../wireframes/) are the early design sketches and still show the first version of the logo.
