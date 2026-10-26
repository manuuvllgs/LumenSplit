import React from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Caption } from "../components/Caption";
import { LogoMark } from "../components/LogoMark";
import { Voice } from "../components/Voice";
import { PROBLEM } from "../config";
import { C, FONT } from "../theme";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const EXPENSES = [
  { what: "Dinner in Alfama", who: "Ana", amt: "€60" },
  { what: "Tuk-tuk to Belém", who: "Ben", amt: "€18" },
  { what: "Pastéis de nata", who: "Carla", amt: "€12" },
  { what: "Fado tickets", who: "Ana", amt: "€45" },
];

/** Beat 1 (0–5.5 s): easy to track, annoying to pay. */
const TrackBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 180px", gap: 120 }}>
      <div style={{ flex: 1 }}>
        <Interactive.Div
          name="Track"
          style={{
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: 96,
            whiteSpace: "nowrap",
            color: C.bone,
            lineHeight: 1.05,
            opacity: interpolate(frame, [0, 12], [0, 1], clamp),
          }}
        >
          Easy to track.
        </Interactive.Div>
        <Interactive.Div
          name="Pay"
          style={{
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: 96,
            whiteSpace: "nowrap",
            color: C.gold,
            lineHeight: 1.05,
            marginTop: 10,
            opacity: interpolate(frame, [2.9 * fps, 3.3 * fps], [0, 1], clamp),
            translate: interpolate(frame, [2.9 * fps, 3.5 * fps], ["0px 30px", "0px 0px"], { ...clamp, easing: ease }),
          }}
        >
          Annoying to pay.
        </Interactive.Div>
      </div>
      <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 16 }}>
        {EXPENSES.map((e, i) => (
          <Interactive.Div
            key={e.what}
            name={`Expense ${i + 1}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: C.slate2,
              border: `1px solid ${C.line}`,
              borderRadius: 18,
              padding: "22px 28px",
              fontFamily: FONT.text,
              opacity: interpolate(frame, [6 + i * 8, 16 + i * 8], [0, 1], clamp),
              translate: interpolate(frame, [6 + i * 8, 22 + i * 8], ["60px 0px", "0px 0px"], { ...clamp, easing: ease }),
            }}
          >
            <div>
              <div style={{ fontSize: 34, fontWeight: 600, color: C.bone }}>{e.what}</div>
              <div style={{ fontSize: 24, color: C.muted, marginTop: 2 }}>paid by {e.who}</div>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 36, color: C.bone }}>{e.amt}</div>
          </Interactive.Div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Beat 2 (5.5–11 s): the app says who owes what; the money goes elsewhere, or never. */
const OweBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dests = ["Bank transfer?", "Cash?", "Another app?", "…never"];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 60 }}>
      <Interactive.Div
        name="Owes card"
        style={{
          backgroundColor: C.bone,
          color: C.ink,
          borderRadius: 28,
          padding: "36px 56px",
          fontFamily: FONT.display,
          fontWeight: 800,
          fontSize: 88,
          opacity: interpolate(frame, [0, 10], [0, 1], clamp),
          scale: interpolate(frame, [0, 16], [0.9, 1], { ...clamp, easing: ease, output: "perceptual-scale" }),
        }}
      >
        Ben owes Ana <span style={{ fontFamily: FONT.mono, fontWeight: 500 }}>€43</span>
      </Interactive.Div>
      <div style={{ display: "flex", gap: 28 }}>
        {dests.map((d, i) => (
          <Interactive.Div
            key={d}
            name={`Destination ${i + 1}`}
            style={{
              fontFamily: FONT.text,
              fontWeight: 600,
              fontSize: 44,
              padding: "18px 32px",
              borderRadius: 999,
              border: `2px dashed ${i === dests.length - 1 ? C.neg : C.muted}`,
              color: i === dests.length - 1 ? C.neg : C.muted,
              opacity: interpolate(frame, [1.4 * fps + i * 0.7 * fps, 1.8 * fps + i * 0.7 * fps], [0, 1], clamp),
              translate: interpolate(
                frame,
                [1.4 * fps + i * 0.7 * fps, 2 * fps + i * 0.7 * fps],
                ["0px 30px", "0px 0px"],
                { ...clamp, easing: ease },
              ),
            }}
          >
            {d}
          </Interactive.Div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Beat 3 (11–16 s): across borders, the fee beats the debt. */
const FeeBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Bar: React.FC<{ label: string; amt: string; w: number; color: string; at: number }> = ({ label, amt, w, color, at }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
      <div style={{ width: 380, fontFamily: FONT.text, fontWeight: 600, fontSize: 46, color: C.bone, textAlign: "right" }}>
        {label}
      </div>
      <Interactive.Div
        name={label}
        style={{
          height: 96,
          borderRadius: 16,
          backgroundColor: color,
          width: interpolate(frame, [at, at + 0.9 * fps], [0, w], { ...clamp, easing: ease }),
        }}
      />
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 52,
          color,
          opacity: interpolate(frame, [at + 0.6 * fps, at + 0.9 * fps], [0, 1], clamp),
        }}
      >
        {amt}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px", gap: 40 }}>
      <Interactive.Div
        name="Borders"
        style={{
          fontFamily: FONT.display,
          fontWeight: 800,
          fontSize: 96,
          color: C.bone,
          marginBottom: 30,
          opacity: interpolate(frame, [0, 12], [0, 1], clamp),
        }}
      >
        Across borders?
      </Interactive.Div>
      <Bar label="The debt" amt="€16" w={300} color={C.muted} at={0.4 * fps} />
      <Bar label="The fees" amt="€25" w={470} color={C.neg} at={1.2 * fps} />
    </AbsoluteFill>
  );
};

/** Beat 4 (16–20 s): Meet LumenSplit. */
const MeetBeat: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.gold,
        justifyContent: "center",
        alignItems: "center",
        clipPath: `circle(${interpolate(frame, [0, 16], [0, 120], { ...clamp, easing: ease })}% at 50% 50%)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Interactive.Div
          name="Logo"
          style={{
            scale: interpolate(frame, [6, 24], [0.6, 1], { ...clamp, easing: Easing.spring({ damping: 12 }), output: "perceptual-scale" }),
            rotate: interpolate(frame, [6, 24], ["-20deg", "0deg"], { ...clamp, easing: ease }),
          }}
        >
          <LogoMark size={220} style={{ filter: "drop-shadow(0 0 0 #0f0f0f)", outline: `6px solid ${C.ink}`, borderRadius: 50 }} />
        </Interactive.Div>
        <div>
          <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: 48, color: C.ink, opacity: interpolate(frame, [10, 20], [0, 1], clamp) }}>
            Meet
          </div>
          <Interactive.Div
            name="Wordmark"
            style={{
              fontFamily: FONT.display,
              fontWeight: 800,
              fontSize: 160,
              lineHeight: 1,
              color: C.ink,
              letterSpacing: -3,
              opacity: interpolate(frame, [12, 24], [0, 1], clamp),
              translate: interpolate(frame, [12, 28], ["30px 0px", "0px 0px"], { ...clamp, easing: ease }),
            }}
          >
            LumenSplit
          </Interactive.Div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ProblemScene: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Backdrop>
      <Sequence name="Track" durationInFrames={Math.round(4.8 * fps)}>
        <FadeOut>
          <TrackBeat />
        </FadeOut>
      </Sequence>
      <Sequence name="Owes" from={Math.round(4.8 * fps)} durationInFrames={Math.round(4.8 * fps)}>
        <FadeOut>
          <OweBeat />
        </FadeOut>
      </Sequence>
      <Sequence name="Fees" from={Math.round(9.6 * fps)} durationInFrames={Math.round(3.6 * fps)}>
        <FadeOut>
          <FeeBeat />
        </FadeOut>
      </Sequence>
      <Sequence name="Meet" from={Math.round(13.2 * fps)}>
        <MeetBeat />
      </Sequence>
      <Sequence name="Captions" durationInFrames={Math.round(13.2 * fps)}>
        <Caption text={PROBLEM.vo.replace(" Meet LumenSplit.", "")} cues={PROBLEM.cues} />
      </Sequence>
      <Voice file={PROBLEM.voice} />
    </Backdrop>
  );
};

/** Fades its children out over the last 8 frames of the enclosing sequence. */
const FadeOut: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp) }}>
      {children}
    </AbsoluteFill>
  );
};
