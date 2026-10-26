import React from "react";
import { Composition, Folder } from "remotion";
import { LumenSplitDemo, TOTAL_FRAMES } from "./LumenSplitDemo";
import { SCENES } from "./scenes";
import { FPS, HEIGHT, WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LumenSplitDemo"
      component={LumenSplitDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Folder name="Scenes">
      {SCENES.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={s.component}
          durationInFrames={s.durationInFrames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </Folder>
  </>
);
