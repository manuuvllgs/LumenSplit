// Generates a placeholder English voice-over with macOS `say`, one file per scene,
// from the vo texts in src/config.ts. Usage: npm run voice  [-- --voice Samantha --rate 170]
// Replace any file in public/voice/ with a real recording (same name) whenever you like.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const voice = arg("voice", "Samantha");
const rate = arg("rate", "170");

const src = readFileSync(new URL("../src/config.ts", import.meta.url), "utf8");
const lines = [...src.matchAll(/voice: "([^"]+)",\s*vo: "([^"]+)"/g)];
mkdirSync("public/voice", { recursive: true });
for (const [, file, text] of lines) {
  const tmp = `public/voice/${file.replace(".mp3", ".m4a")}.aiff`;
  execFileSync("say", ["-v", voice, "-r", rate, "-o", tmp, text]);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", tmp, `public/voice/${file.replace(".mp3", ".m4a")}`]);
  rmSync(tmp);
  console.log("✓", file);
}
