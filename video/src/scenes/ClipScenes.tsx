import React from "react";
import { ClipScene } from "../components/ClipScene";
import { CLIPS } from "../config";

// One named component per scene, so each gets its own timeline in the Studio.
export const BalancesScene: React.FC = () => <ClipScene cfg={CLIPS.balances} />;
export const SettleAllScene: React.FC = () => <ClipScene cfg={CLIPS.settleAll} />;
export const InviteScene: React.FC = () => <ClipScene cfg={CLIPS.invite} />;
export const JoinScene: React.FC = () => <ClipScene cfg={CLIPS.join} />;
export const CustomSplitScene: React.FC = () => <ClipScene cfg={CLIPS.custom} />;
export const PayEurosScene: React.FC = () => <ClipScene cfg={CLIPS.euros} />;
export const PasskeyScene: React.FC = () => <ClipScene cfg={CLIPS.passkey} />;
