import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ClipConfig } from "../config";
import { C, FONT } from "../theme";
import { optionalStatic } from "./assets";
import { Backdrop } from "./Backdrop";
import { Caption } from "./Caption";
import { Placeholder } from "./Placeholder";
import { SceneTag } from "./SceneTag";
import { Voice } from "./Voice";

const FRAME_W = 1340;
const BAR_H = 46;
const CONTENT_H = Math.round((FRAME_W * 9) / 16); // 754

/** A desktop screen recording inside a browser window, over the brand backdrop. */
export const ClipScene: React.FC<{ cfg: ClipConfig }> = ({ cfg }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const src = optionalStatic(`clips/${cfg.clip}`);

  return (
    <Backdrop>
      <Interactive.Div
        name="Browser"
        style={{
          position: "absolute",
          left: (1920 - FRAME_W) / 2,
          top: 84,
          width: FRAME_W,
          height: BAR_H + CONTENT_H,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: C.slate2,
          border: `1px solid ${C.line}`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(frame, [0, 22, durationInFrames], [0.96, 1, 1.02], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear],
            output: "perceptual-scale",
          }),
        }}
      >
        <div
          style={{
            height: BAR_H,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 18px",
            backgroundColor: "#262838",
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
          ))}
          <div
            style={{
              marginLeft: 24,
              flex: 1,
              maxWidth: 560,
              height: 28,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.06)",
              color: C.muted,
              fontFamily: FONT.mono,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              paddingLeft: 14,
            }}
          >
            lumensplit · Stellar testnet
          </div>
        </div>
        <div style={{ position: "relative", height: CONTENT_H, backgroundColor: C.bone }}>
          {src ? (
            <Video
              src={src}
              muted
              trimBefore={Math.round(cfg.trimBeforeSeconds * fps)}
              playbackRate={cfg.playbackRate}
              objectFit="contain"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Placeholder file={cfg.clip} todo={cfg.todo} />
          )}
        </div>
      </Interactive.Div>
      <SceneTag n={cfg.n} title={cfg.title} account={cfg.account} style={{ left: (1920 - FRAME_W) / 2, top: 22 }} />
      <AbsoluteFill>
        <Caption text={cfg.vo} cues={cfg.cues} style={{ bottom: 22 }} />
      </AbsoluteFill>
      <Voice file={cfg.voice} />
    </Backdrop>
  );
};
