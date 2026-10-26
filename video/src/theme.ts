import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Brand fonts bundled in public/fonts (from @fontsource), so rendering works offline.
const faces: [string, string, number[]][] = [
  ["Wix Madefor Display", "wix-madefor-display", [600, 700, 800]],
  ["Wix Madefor Text", "wix-madefor-text", [400, 500, 600]],
  ["IBM Plex Mono", "ibm-plex-mono", [400, 500]],
];
for (const [family, file, weights] of faces) {
  for (const w of weights) {
    loadFont({ family, url: staticFile(`fonts/${file}-latin-${w}-normal.woff2`), weight: String(w) });
  }
}

export const FONT = {
  display: "'Wix Madefor Display', sans-serif",
  text: "'Wix Madefor Text', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

/** LumenSplit brand palette (docs/brand/README.md). */
export const C = {
  gold: "#fdda24",
  ink: "#0f0f0f",
  bone: "#f6f4ef",
  slate: "#14161f",
  slate2: "#1f2130",
  line: "#2c2f42",
  periwinkle: "#4b50b5",
  muted: "#aeb2c4",
  pos: "#3ecf8e",
  neg: "#ff6b6b",
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FADE = 12; // frames of cross-fade between scenes
