import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SCENES } from "./scenes";
import { FADE } from "./theme";

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.durationInFrames, 0) - FADE * (SCENES.length - 1);

export const LumenSplitDemo: React.FC = () => (
  <TransitionSeries>
    {SCENES.flatMap(({ id, component: Scene, durationInFrames }, i) => [
      ...(i > 0
        ? [<TransitionSeries.Transition key={`${id}-t`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />]
        : []),
      <TransitionSeries.Sequence key={id} name={id} durationInFrames={durationInFrames}>
        <Scene />
      </TransitionSeries.Sequence>,
    ])}
  </TransitionSeries>
);
