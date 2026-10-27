import { createCheckBits, detectsCorruption, SCHEMES } from "./checksums";
import { createRandomGenerator, mixSeed } from "./random";
import type {
  ChannelType,
  SchemeResult,
  SimulationConfig,
  SimulationResult,
} from "./types";

type ChannelState = "good" | "bad";

function makePayload(bitCount: number, random: () => number): Uint8Array {
  const payload = new Uint8Array(bitCount);

  for (let index = 0; index < bitCount; index += 1) {
    payload[index] = random() < 0.5 ? 0 : 1;
  }

  return payload;
}

function transmitOverBsc(
  frame: Uint8Array,
  bitErrorRate: number,
  random: () => number,
): { receivedFrame: Uint8Array; hasCorruption: boolean } {
  const receivedFrame = new Uint8Array(frame.length);
  let hasCorruption = false;

  for (let index = 0; index < frame.length; index += 1) {
    const shouldFlip = random() < bitErrorRate;
    receivedFrame[index] = frame[index] ^ Number(shouldFlip);
    hasCorruption ||= shouldFlip;
  }

  return { receivedFrame, hasCorruption };
}

function transmitOverGilbertElliott(
  frame: Uint8Array,
  config: SimulationConfig,
  random: () => number,
  startingState: ChannelState,
): { receivedFrame: Uint8Array; hasCorruption: boolean; endingState: ChannelState } {
  const receivedFrame = new Uint8Array(frame.length);
  let hasCorruption = false;
  let state = startingState;

  for (let index = 0; index < frame.length; index += 1) {
    if (state === "good" && random() < config.goodToBadProbability) {
      state = "bad";
    } else if (state === "bad" && random() < config.badToGoodProbability) {
      state = "good";
    }

    const errorRate =
      state === "good" ? config.goodStateErrorRate : config.badStateErrorRate;
    const shouldFlip = random() < errorRate;
    receivedFrame[index] = frame[index] ^ Number(shouldFlip);
    hasCorruption ||= shouldFlip;
  }

  return { receivedFrame, hasCorruption, endingState: state };
}

function transmitFrame(
  frame: Uint8Array,
  config: SimulationConfig,
  random: () => number,
  startingState: ChannelState,
): { receivedFrame: Uint8Array; hasCorruption: boolean; endingState: ChannelState } {
  if (config.channel === "bsc") {
    const result = transmitOverBsc(frame, config.bitErrorRate, random);

    return {
      ...result,
      endingState: startingState,
    };
  }

  return transmitOverGilbertElliott(frame, config, random, startingState);
}

function simulateScheme(
  config: SimulationConfig,
  scheme: (typeof SCHEMES)[number],
  schemeIndex: number,
  onProgress: (completed: number) => void,
): Promise<SchemeResult> {
  const random = createRandomGenerator(mixSeed(config.seed, schemeIndex));
  const payloadRandom = createRandomGenerator(mixSeed(config.seed, 100));
  const startedAt = performance.now();
  let corruptedFrames = 0;
  let detectedErrors = 0;
  let undetectedErrors = 0;
  let cleanFrames = 0;
  let channelState: ChannelState = "good";

  return new Promise((resolve) => {
    let completedTrials = 0;

    const runChunk = () => {
      const chunkEnd = Math.min(completedTrials + 250, config.trials);

      while (completedTrials < chunkEnd) {
        const payload = makePayload(config.payloadBits, payloadRandom);
        const checkBits = createCheckBits(scheme.id, payload);
        const transmittedFrame = new Uint8Array(payload.length + checkBits.length);
        transmittedFrame.set(payload);
        transmittedFrame.set(checkBits, payload.length);

        const transmission = transmitFrame(transmittedFrame, config, random, channelState);
        channelState = transmission.endingState;

        if (!transmission.hasCorruption) {
          cleanFrames += 1;
        } else {
          corruptedFrames += 1;
          const receivedPayload = transmission.receivedFrame.slice(0, payload.length);
          const receivedCheck = transmission.receivedFrame.slice(payload.length);
          const errorDetected = detectsCorruption(scheme.id, receivedPayload, receivedCheck);

          if (errorDetected) {
            detectedErrors += 1;
          } else {
            undetectedErrors += 1;
          }
        }

        completedTrials += 1;
      }

      onProgress(completedTrials);

      if (completedTrials >= config.trials) {
        resolve({
          schemeId: scheme.id,
          schemeName: scheme.name,
          checkBits: scheme.checkBits,
          corruptedFrames,
          detectedErrors,
          undetectedErrors,
          cleanFrames,
          elapsedMilliseconds: performance.now() - startedAt,
        });
      } else {
        setTimeout(runChunk, 0);
      }
    };

    runChunk();
  });
}

export async function runSimulation(
  config: SimulationConfig,
  onProgress: (schemeName: string, completed: number, total: number) => void,
): Promise<SimulationResult> {
  const results: SchemeResult[] = [];

  for (let schemeIndex = 0; schemeIndex < SCHEMES.length; schemeIndex += 1) {
    const scheme = SCHEMES[schemeIndex];
    const result = await simulateScheme(config, scheme, schemeIndex, (completed) => {
      onProgress(scheme.name, completed, config.trials);
    });

    results.push(result);
  }

  return {
    config,
    results,
    completedAt: new Date().toISOString(),
  };
}

export function validateConfig(config: SimulationConfig): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(config.payloadBits) || config.payloadBits < 8 || config.payloadBits > 4096) {
    errors.push("Payload length must be a whole number between 8 and 4,096 bits.");
  }

  if (!Number.isInteger(config.trials) || config.trials < 100 || config.trials > 50000) {
    errors.push("The number of trials must be a whole number from 100 to 50,000.");
  }

  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 4294967295) {
    errors.push("The random seed must be a whole number from 0 to 4,294,967,295.");
  }

  if (config.channel === "bsc") {
    if (!isProbability(config.bitErrorRate)) {
      errors.push("The BSC bit error probability must be between 0 and 1.");
    }
  } else {
    const gilbertElliottProbabilities = [
      config.goodToBadProbability,
      config.badToGoodProbability,
      config.goodStateErrorRate,
      config.badStateErrorRate,
    ];

    if (!gilbertElliottProbabilities.every(isProbability)) {
      errors.push("All Gilbert–Elliott transition and error probabilities must be between 0 and 1.");
    }

    if (config.badStateErrorRate < config.goodStateErrorRate) {
      errors.push("The bad-state error probability should be at least as large as the good-state probability.");
    }
  }

  return errors;
}

function isProbability(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function getChannelLabel(channel: ChannelType): string {
  return channel === "bsc" ? "Binary symmetric channel" : "Gilbert–Elliott burst channel";
}
