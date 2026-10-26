import React from "react";
import { Audio } from "@remotion/media";
import { optionalStatic } from "./assets";

/** Plays public/voice/<file> if it exists (record it or run scripts/make-voice.sh). */
export const Voice: React.FC<{ file: string; delay?: number }> = ({ file, delay = 8 }) => {
  const src = optionalStatic(`voice/${file}`);
  if (!src) return null;
  return <Audio src={src} from={delay} />;
};
