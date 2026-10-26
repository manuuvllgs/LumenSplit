import React from "react";
import { C } from "../theme";

/** LumenSplit logo B: gold tile with a split coin. */
export const LogoMark: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" style={style}>
    <rect width="512" height="512" rx="116" fill={C.gold} />
    <g transform="translate(256 256) scale(0.92) translate(-256 -256)">
      <path d="M240 106 A150 150 0 0 0 240 406 Z" fill={C.ink} />
      <path d="M272 106 A150 150 0 0 1 272 406 Z" fill={C.ink} opacity=".18" />
      <path d="M272 106 A150 150 0 0 1 272 406" fill="none" stroke={C.ink} strokeWidth="18" />
      <rect x="249" y="70" width="14" height="372" rx="7" fill={C.ink} />
    </g>
  </svg>
);
