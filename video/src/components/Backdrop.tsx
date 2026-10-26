import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

/** Dark slate background with a slow-drifting gold glow. */
export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: C.slate }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 600px at ${interpolate(frame, [0, durationInFrames], [18, 30])}% 0%, rgba(253,218,36,0.10), transparent 70%), radial-gradient(800px 700px at ${interpolate(frame, [0, durationInFrames], [92, 80])}% 100%, rgba(75,80,181,0.22), transparent 70%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
