import React from "react";
import { Video } from "@remotion/media";
import { Easing, Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ClipConfig } from "../config";
import { C, FONT } from "../theme";
import { optionalStatic } from "./assets";
import { Backdrop } from "./Backdrop";
import { Caption } from "./Caption";
import { Placeholder } from "./Placeholder";
import { SceneTag } from "./SceneTag";
import { Voice } from "./Voice";

const PHONE_H = 920;
const PHONE_W = Math.round(PHONE_H * (9 / 19.5)) + 24; // ~448 incl. bezel

const POINTS = [
  { k: "No extension, no seed phrase", v: "Face ID or fingerprint" },
  { k: "Smart account (C…)", v: "created with Nido" },
  { k: "Authorize once", v: "7 days · daily XLM cap on-chain" },
];

/** The passkey bonus: a portrait phone recording plus three key points. */
export const PhoneScene: React.FC<{ cfg: ClipConfig }> = ({ cfg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = optionalStatic(`clips/${cfg.clip}`);

  return (
    <Backdrop>
      <Interactive.Div
        name="Phone"
        style={{
          position: "absolute",
          left: 250,
          top: (1080 - PHONE_H) / 2,
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 64,
          padding: 12,
          backgroundColor: "#0b0c12",
          border: `2px solid ${C.line}`,
          boxShadow: "0 50px 140px rgba(0,0,0,0.6)",
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          translate: interpolate(frame, [0, 26], ["0px 60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", backgroundColor: C.bone }}>
          {src ? (
            <Video
              src={src}
              muted
              trimBefore={Math.round(cfg.trimBeforeSeconds * fps)}
              playbackRate={cfg.playbackRate}
              objectFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Placeholder file={cfg.clip} todo={cfg.todo} compact />
          )}
        </div>
      </Interactive.Div>

      <div style={{ position: "absolute", left: 860, top: 100, width: 860 }}>
        <SceneTag n={cfg.n} title={cfg.title} account={cfg.account} style={{ position: "relative" }} />
        <Interactive.Div
          name="Headline"
          style={{
            marginTop: 28,
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: 86,
            lineHeight: 1.02,
            color: C.bone,
            opacity: interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Your face is
          <br />
          <span style={{ color: C.gold }}>your wallet.</span>
        </Interactive.Div>
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
          {POINTS.map((p, i) => (
            <Interactive.Div
              key={p.k}
              name={`Point ${i + 1}`}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                fontFamily: FONT.text,
                opacity: interpolate(frame, [2 * fps + i * 2.4 * fps, 2.6 * fps + i * 2.4 * fps], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                translate: interpolate(
                  frame,
                  [2 * fps + i * 2.4 * fps, 2.8 * fps + i * 2.4 * fps],
                  ["30px 0px", "0px 0px"],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
                ),
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.gold, flexShrink: 0, translate: "0px -4px" }} />
              <div>
                <div style={{ fontSize: 44, fontWeight: 600, color: C.bone }}>{p.k}</div>
                <div style={{ fontSize: 32, color: C.muted, marginTop: 4 }}>{p.v}</div>
              </div>
            </Interactive.Div>
          ))}
        </div>
      </div>

      <Caption text={cfg.vo} style={{ left: 860, right: 120, bottom: 48, justifyContent: "flex-start" }} />
      <Voice file={cfg.voice} />
    </Backdrop>
  );
};
