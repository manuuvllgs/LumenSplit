import React from "react";
import { CLIPS, CLOSE, PROBLEM } from "../config";
import { CloseScene } from "./CloseScene";
import {
  BalancesScene,
  CustomSplitScene,
  InviteScene,
  JoinScene,
  PasskeyScene,
  PayEurosScene,
  SettleAllScene,
} from "./ClipScenes";
import { ProblemScene } from "./ProblemScene";

/** Video order. The passkey bonus goes right before the closing card. */
export const SCENES: { id: string; component: React.FC; durationInFrames: number }[] = [
  { id: "S1-Problem", component: ProblemScene, durationInFrames: PROBLEM.durationInFrames },
  { id: "S2-Balances", component: BalancesScene, durationInFrames: CLIPS.balances.durationInFrames },
  { id: "S3-SettleAll", component: SettleAllScene, durationInFrames: CLIPS.settleAll.durationInFrames },
  { id: "S4-Invite", component: InviteScene, durationInFrames: CLIPS.invite.durationInFrames },
  { id: "S5-Join", component: JoinScene, durationInFrames: CLIPS.join.durationInFrames },
  { id: "S6-CustomSplit", component: CustomSplitScene, durationInFrames: CLIPS.custom.durationInFrames },
  { id: "S7-PayEuros", component: PayEurosScene, durationInFrames: CLIPS.euros.durationInFrames },
  { id: "S8-Passkey", component: PasskeyScene, durationInFrames: CLIPS.passkey.durationInFrames },
  { id: "S9-Close", component: CloseScene, durationInFrames: CLOSE.durationInFrames },
];
