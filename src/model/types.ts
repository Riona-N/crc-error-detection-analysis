export type ChannelType = "bsc" | "gilbert-elliott";

export interface SimulationConfig {
  channel: ChannelType;
  payloadBits: number;
  trials: number;
  seed: number;
  bitErrorRate: number;
  goodToBadProbability: number;
  badToGoodProbability: number;
  goodStateErrorRate: number;
  badStateErrorRate: number;
}

export interface SchemeResult {
  schemeId: string;
  schemeName: string;
  checkBits: number;
  corruptedFrames: number;
  detectedErrors: number;
  undetectedErrors: number;
  cleanFrames: number;
  elapsedMilliseconds: number;
}

export interface SimulationResult {
  config: SimulationConfig;
  results: SchemeResult[];
  completedAt: string;
}

export interface SchemeDefinition {
  id: string;
  name: string;
  checkBits: number;
}
