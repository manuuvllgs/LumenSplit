import { FPS } from "./theme";

export type ClipConfig = {
  /** Scene number shown in the tag. */
  n: string;
  title: string;
  /** Who is using the app in this clip. */
  account: string;
  /** File in public/clips/. */
  clip: string;
  /** Scene length in frames. */
  durationInFrames: number;
  /** Skip this many seconds at the start of the recording. */
  trimBeforeSeconds: number;
  /** Speed up long recordings to fit the slot (1 = real time). */
  playbackRate: number;
  /** File in public/voice/ (optional). */
  voice: string;
  /** Sentence start/end (seconds into the voice file), for caption sync. */
  cues?: number[][];
  /** Voice-over text, also shown as captions. */
  vo: string;
  /** What to record (shown on the placeholder until the clip exists). */
  todo: string;
};

/**
 * Edit trimBeforeSeconds / playbackRate here once the recordings exist,
 * so each clip's action fits its slot.
 */
export const CLIPS = {
  balances: {
    n: "02",
    title: "Balances",
    account: "Ana",
    clip: "balances.mp4",
    durationInFrames: 20 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "02.mp3",
    cues: [[0, 3.52], [3.68, 12.56]],
    vo: "Ana, Ben and Carla spent a weekend in Lisbon. Every expense lives in a Soroban smart contract, and the contract itself computes the fewest payments: two, instead of five crossed debts.",
    todo: "Open Lisbon trip → 5 expenses, Ana +43 · Ben −59 · Carla +16 → Settle up: Ben → Ana 43, Ben → Carla 16",
  },
  settleAll: {
    n: "03",
    title: "Settle all",
    account: "Ben",
    clip: "settle-all.mp4",
    durationInFrames: 20 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "03.mp3",
    cues: [[0, 1.68], [1.92, 4.48], [4.72, 9.52], [10.0, 13.52]],
    vo: "Ben owes both of them. He taps Settle all and signs once. Both payments happen in one atomic transaction: all of it, or nothing. Here they are, inside a single transaction on Stellar.",
    todo: "Settle all → sign once in Freighter → everyone at 0 → open stellar.expert: two transfers in one transaction",
  },
  invite: {
    n: "04",
    title: "Invite",
    account: "Ana",
    clip: "invite.mp4",
    durationInFrames: 15 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "04.mp3",
    cues: [[0, 2.04], [2.32, 8.16]],
    vo: "Next trip, Dani joins. No copying wallet addresses: Ana creates an invite, a link or a QR code.",
    todo: "Invite friends → Create link → sign → QR + link appear → copy link",
  },
  join: {
    n: "05",
    title: "Join",
    account: "Dani",
    clip: "join.mp4",
    durationInFrames: 15 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "05.mp3",
    cues: [[0, 3.28], [3.36, 7.6]],
    vo: "Dani opens it and joins with one signature. The link carries a secret, and only its hash is stored on-chain.",
    todo: "Paste link → Join group → sign → Dani in the group with balance 0",
  },
  custom: {
    n: "06",
    title: "Custom amounts",
    account: "Ana",
    clip: "expense-custom.mp4",
    durationInFrames: 20 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "06.mp3",
    cues: [[0, 2.08], [2.32, 10.24]],
    vo: "Not every split is equal. At the wine tasting Dani had the good bottle, so Ana types each share: ten for her, twenty-five for Dani.",
    todo: "Add expense → Wine tasting → Custom amounts: Ana 10, Dani 25 → sign → Ana +25 · Dani −25",
  },
  euros: {
    n: "07",
    title: "Pay in euros",
    account: "Dani",
    clip: "pay-euros.mp4",
    durationInFrames: 25 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "07.mp3",
    cues: [[0, 1.84], [2.0, 7.28], [7.52, 13.28]],
    vo: "Dani only has euros. She taps Pay in euros, and Stellar's built-in exchange converts them on the fly. Ana receives exactly twenty-five XLM, in seconds, for a fraction of a cent.",
    todo: "Settle up → Pay in euros → quote ≈ 6.4 EURT → sign 1/2 (convert) and 2/2 (pay) → everyone at 0",
  },
  passkey: {
    n: "+",
    title: "Passkeys · dark mode",
    account: "a new user",
    clip: "passkey.mp4",
    durationInFrames: 25 * FPS,
    trimBeforeSeconds: 0,
    playbackRate: 1,
    voice: "08.mp3",
    cues: [[0, 3.52], [3.92, 10.64], [11.04, 14.24], [14.48, 20.16]],
    vo: "One more thing: LumenSplit also comes in dark mode. And thanks to Nido, from HackMeridian partner The Aha Company, anyone can create a wallet with just a passkey. Touch ID, no extension, no seed phrase. Then you authorize LumenSplit once, with a daily limit the smart account enforces on-chain.",
    todo: "Dark mode → Sign in with a passkey → create a Nido with Touch ID → back in LumenSplit: Authorise LumenSplit once",
  },
} satisfies Record<string, ClipConfig>;

export const PROBLEM = {
  durationInFrames: 17 * FPS,
  voice: "01.mp3",
    cues: [[0, 4.4], [4.56, 9.28], [9.32, 12.88]],
  vo: "Splitting bills with friends is easy to track and annoying to pay. Apps say who owes what, but the money moves somewhere else, or never. And across borders, the fees can be bigger than the debt. Meet LumenSplit.",
};

export const CLOSE = {
  durationInFrames: 15 * FPS,
  voice: "09.mp3",
    cues: [[0, 4.96], [5.44, 9.44]],
  vo: "Stellar gives us five-second payments, tiny fees and native currency conversion. Next: cash out to your bank through anchors, and mainnet. LumenSplit: split bills, settle in seconds.",
};
