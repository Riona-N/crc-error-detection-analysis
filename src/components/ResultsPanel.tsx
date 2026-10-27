import ResultsCharts from "./ResultsCharts";
import { getChannelLabel } from "../model/simulation";
import type { SchemeResult, SimulationConfig } from "../model/types";

interface ResultsPanelProps {
  results: SchemeResult[];
  config: SimulationConfig;
  completedAt: string;
}

function formatProbability(value: number): string {
  if (value === 0) {
    return "0";
  }

  if (value < 0.0001) {
    return value.toExponential(2);
  }

  return value.toFixed(value < 0.01 ? 5 : 4);
}

function getDetectionRate(result: SchemeResult): number | undefined {
  if (result.corruptedFrames === 0) {
    return undefined;
  }

  return result.detectedErrors / result.corruptedFrames;
}

function getArqGoodput(result: SchemeResult, config: SimulationConfig): number {
  const frameBits = config.payloadBits + result.checkBits;
  const cleanFrameProbability = result.cleanFrames / config.trials;

  return (config.payloadBits / frameBits) * cleanFrameProbability;
}

function getExpectedRetransmissions(result: SchemeResult): number {
  const acceptedFrames = result.cleanFrames + result.undetectedErrors;

  if (acceptedFrames === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return result.detectedErrors / acceptedFrames;
}

function getConfidenceNote(result: SchemeResult): string {
  if (result.corruptedFrames === 0) {
    return "No corrupted frames observed; detection rate is not estimable.";
  }

  if (result.undetectedErrors === 0) {
    return `0 misses in ${result.corruptedFrames.toLocaleString()} corrupted frames; this is not proof of zero risk.`;
  }

  return `${result.undetectedErrors.toLocaleString()} miss(es) in ${result.corruptedFrames.toLocaleString()} corrupted frames.`;
}

function getRecommendation(results: SchemeResult[], config: SimulationConfig): string {
  const candidate = [...results].sort((first, second) => {
    const firstMisses = first.undetectedErrors / config.trials;
    const secondMisses = second.undetectedErrors / config.trials;

    if (firstMisses !== secondMisses) {
      return firstMisses - secondMisses;
    }

    return first.checkBits - second.checkBits;
  })[0];

  if (!candidate) {
    return "Run an experiment to see an initial recommendation.";
  }

  return `${candidate.schemeName} had the fewest observed undetected errors, with ${candidate.checkBits} check bit(s). This ranks only the current run; consider overhead and computation time before making a choice.`;
}

export default function ResultsPanel({ results, config}: ResultsPanelProps) {
  const totalCorrupted = results.reduce((sum, result) => sum + result.corruptedFrames, 0);
  const totalUndetected = results.reduce((sum, result) => sum + result.undetectedErrors, 0);
  const fastest = [...results].sort(
    (first, second) => first.elapsedMilliseconds - second.elapsedMilliseconds,
  )[0];
 

  return (
    <div className="results-content">
      <section className="result-summary" aria-label="Run summary">
        <div className="summary-intro">
          <span className="eyebrow">Experiment complete</span>
          <h2>Here is what the simulation found</h2>
          <p>
            {getChannelLabel(config.channel)} · {config.payloadBits.toLocaleString()} payload bits ·{" "}
            {config.trials.toLocaleString()} trials per scheme · seed {config.seed}
          </p>
        </div>
        <div className="summary-stats">
          <div className="summary-stat">
            <span>Corrupted frames</span>
            <strong>{totalCorrupted.toLocaleString()}</strong>
            <small>across all five scheme runs</small>
          </div>
          <div className="summary-stat">
            <span>Undetected errors</span>
            <strong>{totalUndetected.toLocaleString()}</strong>
            <small>summed across all five schemes</small>
          </div>
          <div className="summary-stat">
            <span>Fastest in this browser</span>
            <strong>{fastest?.schemeName ?? "—"}</strong>
            <small>{fastest?.elapsedMilliseconds.toFixed(2) ?? "—"} ms measured</small>
          </div>
        </div>
      </section>

      <section className="recommendation-card">
        <div className="recommendation-icon" aria-hidden="true">
          ↗
        </div>
        <div>
          <span className="eyebrow">Run-specific observation</span>
          <p>{getRecommendation(results, config)}</p>
        </div>
      </section>

      <ResultsCharts results={results} config={config} />

      <section className="table-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Side-by-side comparison</span>
            <h2>What each scheme adds and catches</h2>
          </div>
          <span className="table-note">Measured across {config.trials.toLocaleString()} frames each</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Scheme</th>
                <th scope="col">Check bits</th>
                <th scope="col">Overhead</th>
                <th scope="col">Corrupted frames</th>
                <th scope="col">Detection rate*</th>
                <th scope="col">Undetected frames</th>
                <th scope="col">Undetected / frame</th>
                <th scope="col">Expected ARQ retries**</th>
                <th scope="col">Idealized goodput</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const detectionRate = getDetectionRate(result);
                const overhead = (result.checkBits / config.payloadBits) * 100;
                const missedErrorProbability = result.undetectedErrors / config.trials;
                const expectedRetries = getExpectedRetransmissions(result);
                const goodput = getArqGoodput(result, config);

                return (
                  <tr key={result.schemeId}>
                    <th scope="row">{result.schemeName}</th>
                    <td>{result.checkBits}</td>
                    <td>{overhead.toFixed(2)}%</td>
                    <td>{result.corruptedFrames.toLocaleString()}</td>
                    <td>{detectionRate === undefined ? "N/A" : `${(detectionRate * 100).toFixed(2)}%`}</td>
                    <td>{result.undetectedErrors.toLocaleString()}</td>
                    <td title={getConfidenceNote(result)}>{formatProbability(missedErrorProbability)}</td>
                    <td>{Number.isFinite(expectedRetries) ? expectedRetries.toFixed(4) : "N/A"}</td>
                    <td>{(goodput * 100).toFixed(2)}%</td>
                    <td>{result.elapsedMilliseconds.toFixed(2)} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="table-footnote">
          * Detection rate is detected corrupt frames divided by all corrupt frames; it is N/A if none
          were observed. ** Expected retransmissions per accepted frame use the measured frame outcomes
          as a stationary approximation; channel-state feedback is not modeled.
        </p>
      </section>

      <section className="interpretation-grid">
        <article className="interpretation-card">
          <span className="eyebrow">How to read this</span>
          <h3>Undetected error probability</h3>
          <p>
            This is the number of corrupted frames that passed checking divided by all transmitted
            frames. It directly reflects the risk that a damaged frame is accepted.
          </p>
        </article>
        <article className="interpretation-card">
          <span className="eyebrow">Capacity trade-off</span>
          <h3>Overhead and goodput</h3>
          <p>
            Overhead is check bits divided by payload bits. Idealized goodput counts clean payload
            bits and includes check bits on the wire, but it does not model real protocol timing.
          </p>
        </article>
        <article className="interpretation-card">
          <span className="eyebrow">Timing note</span>
          <h3>Computation time</h3>
          <p>
            Time covers payload generation, check computation, channel simulation, and checking in
            this browser. It is not a hardware benchmark and is sensitive to device load.
          </p>
        </article>
      </section>

      <footer className="result-footer">
        <span>
          Seed {config.seed} makes this run reproducible with the same app version and inputs.
        </span>
        
      </footer>
    </div>
  );
}
