import { describe, expect, it } from "vitest";
import { runSimulation, validateConfig } from "./simulation";
import type { SimulationConfig } from "./types";

const BASE_CONFIG: SimulationConfig = {
  channel: "bsc",
  payloadBits: 64,
  trials: 100,
  seed: 12345,
  bitErrorRate: 0,
  goodToBadProbability: 0.01,
  badToGoodProbability: 0.2,
  goodStateErrorRate: 0.0001,
  badStateErrorRate: 0.08,
};

describe("simulation runner", () => {
  it("reports all frames clean when the BSC bit error rate is zero", async () => {
    const result = await runSimulation(BASE_CONFIG, () => undefined);

    expect(result.results).toHaveLength(5);

    for (const schemeResult of result.results) {
      expect(schemeResult.cleanFrames).toBe(BASE_CONFIG.trials);
      expect(schemeResult.corruptedFrames).toBe(0);
      expect(schemeResult.undetectedErrors).toBe(0);
      expect(schemeResult.detectedErrors).toBe(0);
    }
  });

  it("repeats frame counts when the same seed and settings are used", async () => {
    const firstRun = await runSimulation(
      { ...BASE_CONFIG, bitErrorRate: 0.05 },
      () => undefined,
    );
    const secondRun = await runSimulation(
      { ...BASE_CONFIG, bitErrorRate: 0.05 },
      () => undefined,
    );
    const firstCounts = firstRun.results.map((result) => ({
      corruptedFrames: result.corruptedFrames,
      detectedErrors: result.detectedErrors,
      undetectedErrors: result.undetectedErrors,
      cleanFrames: result.cleanFrames,
    }));
    const secondCounts = secondRun.results.map((result) => ({
      corruptedFrames: result.corruptedFrames,
      detectedErrors: result.detectedErrors,
      undetectedErrors: result.undetectedErrors,
      cleanFrames: result.cleanFrames,
    }));

    expect(secondCounts).toEqual(firstCounts);
  });

  it("validates the Gilbert–Elliott bad-state error probability", () => {
    const errors = validateConfig({
      ...BASE_CONFIG,
      channel: "gilbert-elliott",
      goodStateErrorRate: 0.1,
      badStateErrorRate: 0.05,
    });

    expect(errors).toContain(
      "The bad-state error probability should be at least as large as the good-state probability.",
    );
  });

  it("rejects values outside the supported experiment sizes", () => {
    const errors = validateConfig({
      ...BASE_CONFIG,
      payloadBits: 4,
      trials: 60000,
    });

    expect(errors).toContain("Payload length must be a whole number between 8 and 4,096 bits.");
    expect(errors).toContain("The number of trials must be a whole number from 100 to 50,000.");
  });
});
