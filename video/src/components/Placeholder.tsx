import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../theme";

/** Shown where a recording should go until the file exists in public/clips/. */
export const Placeholder: React.FC<{ file: string; todo: string; compact?: boolean }> = ({ file, todo, compact }) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.slate2,
      backgroundImage: `repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,0.025) 22px 44px)`,
      justifyContent: "center",
      alignItems: "center",
      padding: compact ? 36 : 80,
      gap: 24,
      textAlign: "center",
    }}
  >
    <div style={{ fontFamily: FONT.mono, fontSize: compact ? 22 : 30, color: C.gold }}>public/clips/{file}</div>
    <div style={{ fontFamily: FONT.text, fontSize: compact ? 24 : 34, color: C.muted, maxWidth: 1000, lineHeight: 1.4 }}>
      {todo}
    </div>
  </AbsoluteFill>
);
