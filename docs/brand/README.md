# LumenSplit · brand

![logo](logo.svg)

## Logo
- `logo.svg`: horizontal logo for light backgrounds.
- `logo-dark.svg`: horizontal logo for dark backgrounds.
- `logo-mark.svg` / `favicon.svg`: the symbol alone (a coin split in two, with a ray of light between the halves).

## Colours
| Token | Hex | Use |
|---|---|---|
| `primary` | `#5B4BFF` | Main buttons, links, focus |
| `accent` | `#FFC23D` | The "lumen": **Settle up** and **Pay** buttons, highlights |
| `ink` | `#15132E` | Text, dark cards |
| `positive` | `#067647` | You are owed (green) |
| `negative` | `#D92D20` | You owe (red) |
| `zero` | `#667085` | Settled |
| `bg` / `surface` / `line` | `#F7F7FB` / `#FFFFFF` / `#E4E4EE` | Background, cards, borders |

Each colour has a `-soft` variant for pill and chip backgrounds.

## Typography
- **Space Grotesk** 700: headings and every amount (with `tabular-nums`).
- **Inter** 400–700: everything else.

## For the frontend
- Plain CSS: [`tokens.css`](tokens.css) (`--ls-*` variables + `.ls-amount`, `.ls-pos`, `.ls-neg` classes).
- Tailwind: [`tailwind.preset.js`](tailwind.preset.js) → `bg-primary`, `text-positive`, `bg-negative-soft`, `font-display`, `rounded-card`, `shadow-card`…
- Wireframes of the 5 screens: [`../wireframes/`](../wireframes/) (`wireframes.png`, or open `index.html`).

## Copy rules (no crypto jargon)
- "Settle up", "Pay", "You owe", "You are owed". Never "transaction", "invoke", "sign", "i128".
- Amounts big, 2 decimals, currency underneath: `45.00` / `XLM`.
- Addresses shortened (`GA7Q…K3PD`) and replaced by a nickname whenever we have one.
- After a payment, show how long it took and the fee, plus a link to Stellar Expert.
