import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";

/**
 * Shows the voice-over one sentence at a time, timed by character count
 * across the scene (lead-in / lead-out margins included).
 */
export const Caption: React.FC<{
  text: string;
  style?: React.CSSProperties;
  leadIn?: number;
  leadOut?: number;
  /** Sentence [start, end] in seconds of the voice file; when set, captions follow the voice. */
  cues?: number[][];
  /** Frames the voice is delayed by (see Voice). */
  delay?: number;
}> = ({ text, style, leadIn = 12, leadOut = 18, cues, delay = 8 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const parts = text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const span = durationInFrames - leadIn - leadOut;

  let start = leadIn;
  const timed = cues
    ? parts.slice(0, cues.length).map((p, i) => ({
        p,
        from: delay + cues[i][0] * fps,
        to: delay + (i + 1 < cues.length ? cues[i + 1][0] : cues[i][1] + 0.6) * fps,
      }))
    : parts.map((p) => {
        const len = (p.length / total) * span;
        const t = { p, from: start, to: start + len };
        start += len;
        return t;
      });
  const cur =
    timed.find((t) => frame >= t.from && frame < t.to) ??
    (cues || frame < leadIn ? null : timed[timed.length - 1]);
  if (!cur) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 240,
        right: 240,
        bottom: 44,
        display: "flex",
        justifyContent: "center",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT.text,
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.3,
          color: C.bone,
          textAlign: "center",
          backgroundColor: "rgba(15,15,15,0.72)",
          padding: "14px 28px",
          borderRadius: 18,
          opacity: interpolate(frame, [cur.from, cur.from + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [cur.from, cur.from + 8], ["0px 10px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {cur.p}
      </div>
    </div>
  );
};
