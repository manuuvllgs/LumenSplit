import React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Caption } from "../components/Caption";
import { LogoMark } from "../components/LogoMark";
import { Voice } from "../components/Voice";
import { CLOSE } from "../config";
import { C, FONT } from "../theme";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const STATS = [
  { big: "~5 s", small: "to settle a debt" },
  { big: "< $0.01", small: "in network fees" },
  { big: "€ → XLM", small: "converted natively" },
];

const StatsBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 64 }}>
      <div style={{ display: "flex", gap: 40 }}>
        {STATS.map((s, i) => (
          <Interactive.Div
            key={s.big}
            name={`Stat ${i + 1}`}
            style={{
              width: 470,
              padding: "48px 40px",
              borderRadius: 28,
              backgroundColor: C.slate2,
              border: `1px solid ${C.line}`,
              opacity: interpolate(frame, [i * 0.9 * fps, i * 0.9 * fps + 10], [0, 1], clamp),
              translate: interpolate(frame, [i * 0.9 * fps, i * 0.9 * fps + 18], ["0px 40px", "0px 0px"], { ...clamp, easing: ease }),
            }}
          >
            <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 88, color: C.gold, lineHeight: 1 }}>{s.big}</div>
            <div style={{ fontFamily: FONT.text, fontSize: 40, color: C.bone, marginTop: 18 }}>{s.small}</div>
          </Interactive.Div>
        ))}
      </div>
      <Interactive.Div
        name="Next"
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          fontFamily: FONT.text,
          fontSize: 44,
          color: C.muted,
          opacity: interpolate(frame, [3.4 * fps, 3.9 * fps], [0, 1], clamp),
        }}
      >
        <span style={{ fontFamily: FONT.mono, color: C.gold, fontSize: 36 }}>NEXT →</span>
        <span style={{ color: C.bone }}>cash out to your bank via anchors</span>
        <span>·</span>
        <span style={{ color: C.bone }}>mainnet</span>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.gold,
        justifyContent: "center",
        alignItems: "center",
        gap: 30,
        opacity: interpolate(frame, [0, 10], [0, 1], clamp),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <Interactive.Div
          name="Logo"
          style={{ scale: interpolate(frame, [0, 18], [0.7, 1], { ...clamp, easing: Easing.spring({ damping: 12 }), output: "perceptual-scale" }) }}
        >
          <LogoMark size={170} style={{ outline: `5px solid ${C.ink}`, borderRadius: 40 }} />
        </Interactive.Div>
        <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 140, color: C.ink, letterSpacing: -3 }}>LumenSplit</div>
      </div>
      <Interactive.Div
        name="Tagline"
        style={{
          fontFamily: FONT.display,
          fontWeight: 700,
          fontSize: 72,
          color: C.ink,
          opacity: interpolate(frame, [10, 22], [0, 1], clamp),
          translate: interpolate(frame, [10, 26], ["0px 20px", "0px 0px"], { ...clamp, easing: ease }),
        }}
      >
        Split bills, settle in seconds.
      </Interactive.Div>
      <Interactive.Div
        name="Footer"
        style={{
          position: "absolute",
          bottom: 70,
          fontFamily: FONT.mono,
          fontSize: 30,
          color: C.ink,
          opacity: interpolate(frame, [22, 34], [0, 0.8], clamp),
        }}
      >
        github.com/manuuvllgs/LumenSplit · Built on Stellar · HackMeridian Lisbon 2026
      </Interactive.Div>
    </AbsoluteFill>
  );
};

export const CloseScene: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Backdrop>
      <Sequence name="Stats" durationInFrames={Math.round(9.6 * fps)}>
        <StatsBeat />
      </Sequence>
      <Sequence name="End card" from={Math.round(9.6 * fps)}>
        <EndCard />
      </Sequence>
      <Sequence name="Captions" durationInFrames={Math.round(9.6 * fps)}>
        <Caption text={CLOSE.vo.replace(" LumenSplit: split bills, settle in seconds.", "")} cues={CLOSE.cues} />
      </Sequence>
      <Voice file={CLOSE.voice} />
    </Backdrop>
  );
};
