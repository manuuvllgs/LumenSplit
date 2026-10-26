import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";

/** "02 · Balances" pill plus the account chip ("as Ana"). */
export const SceneTag: React.FC<{ n: string; title: string; account: string; style?: React.CSSProperties }> = ({
  n,
  title,
  account,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        gap: 14,
        alignItems: "center",
        opacity: interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(frame, [6, 24], ["-24px 0px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        ...style,
      }}
    >
      <div
        style={{
          backgroundColor: C.gold,
          color: C.ink,
          fontFamily: FONT.display,
          fontWeight: 800,
          fontSize: 30,
          padding: "10px 22px",
          borderRadius: 999,
        }}
      >
        {n} · {title}
      </div>
      <div
        style={{
          backgroundColor: "rgba(246,244,239,0.08)",
          border: `1px solid ${C.line}`,
          color: C.bone,
          fontFamily: FONT.text,
          fontWeight: 600,
          fontSize: 26,
          padding: "10px 20px",
          borderRadius: 999,
        }}
      >
        as {account}
      </div>
    </div>
  );
};
