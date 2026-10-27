import { useState, type FormEvent } from "react";
import ResultsPanel from "./components/ResultsPanel";
import { getChannelLabel, runSimulation, validateConfig } from "./model/simulation";
import type { ChannelType, SimulationConfig, SimulationResult } from "./model/types";

const DEFAULT_CONFIG: SimulationConfig = {
  channel: "bsc",
  payloadBits: 256,
  trials: 5000,
  seed: 20261027,
  bitErrorRate: 0.001,
  goodToBadProbability: 0.01,
  badToGoodProbability: 0.2,
  goodStateErrorRate: 0.0001,
  badStateErrorRate: 0.08,
};

type NumericSetting =
  | "payloadBits"
  | "trials"
  | "seed"
  | "bitErrorRate"
  | "goodToBadProbability"
  | "badToGoodProbability"
  | "goodStateErrorRate"
  | "badStateErrorRate";

function getFieldValue(value: string): number {
  return value === "" ? Number.NaN : Number(value);
}

function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ schemeName: "", completed: 0, total: 0, schemeIndex: 0 });

  const updateSetting = (key: NumericSetting, value: string) => {
    setConfig((current) => ({ ...current, [key]: getFieldValue(value) }));
  };

  const updateChannel = (channel: ChannelType) => {
    setConfig((current) => ({ ...current, channel }));
  };

  const startSimulation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateConfig(config);
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsRunning(true);
    setResult(null);
    setProgress({ schemeName: "Even parity", completed: 0, total: config.trials, schemeIndex: 1 });

    try {
      const simulationResult = await runSimulation(config, (schemeName, completed, total) => {
        setProgress((current) => ({
          schemeName,
          completed,
          total,
          schemeIndex: current.schemeName === schemeName ? current.schemeIndex : current.schemeIndex + 1,
        }));
      });

      setResult(simulationResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The simulation could not be completed.";
      setErrors([message]);
    } finally {
      setIsRunning(false);
    }
  };

  const progressPercent =
    progress.total === 0
      ? 0
      : Math.min(((progress.schemeIndex - 1 + progress.completed / progress.total) / 5) * 100, 100);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="LinkLab home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>LinkLab</span>
          <span className="brand-divider" />
          <span className="brand-caption">Error detection bench</span>
        </a>
        <span className="local-badge">
          <span className="status-dot" />
        </span>
      </header>

      <main className="page-layout">
        <section className="page-heading">
          <div className="heading-copy">
            <span className="eyebrow">Computer networks · Research simulator</span>
            <h1>How well does your error check protect the link?</h1>
            <p>
              Compare CRC, parity, and checksum under random and burst errors. Explore the balance
              between catching corruption, extra bits, and retransmission cost.
            </p>
          </div>
          <div className="heading-art" aria-hidden="true">
            <div className="signal-ring signal-ring-outer" />
            <div className="signal-ring signal-ring-inner" />
            <div className="signal-core">CRC</div>
            <span className="signal-bit bit-one">1</span>
            <span className="signal-bit bit-zero">0</span>
            <span className="signal-bit bit-two">1</span>
          </div>
        </section>

        <div className="workspace-grid">
          <aside className="controls-column">
            <form className="control-card" onSubmit={startSimulation} noValidate>
              <div className="control-heading">
                <div className="control-heading-icon" aria-hidden="true">
                  ⚙
                </div>
                <div>
                  <span className="eyebrow">Experiment setup</span>
                  <h2>Choose your conditions</h2>
                </div>
              </div>

              <fieldset className="channel-selector">
                <legend>Channel model</legend>
                <label className={`channel-option ${config.channel === "bsc" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="channel"
                    value="bsc"
                    checked={config.channel === "bsc"}
                    onChange={() => updateChannel("bsc")}
                  />
                  <span className="radio-indicator" />
                  <span className="channel-option-copy">
                    <strong>Random errors</strong>
                    <small>Binary symmetric channel</small>
                  </span>
                </label>
                <label
                  className={`channel-option ${config.channel === "gilbert-elliott" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value="gilbert-elliott"
                    checked={config.channel === "gilbert-elliott"}
                    onChange={() => updateChannel("gilbert-elliott")}
                  />
                  <span className="radio-indicator" />
                  <span className="channel-option-copy">
                    <strong>Burst errors</strong>
                    <small>Gilbert–Elliott channel</small>
                  </span>
                </label>
              </fieldset>

              {config.channel === "bsc" ? (
                <label className="field">
                  <span className="field-label">Bit error probability</span>
                  <span className="field-help">Chance that any transmitted bit flips independently.</span>
                  <span className="input-suffix">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.0001"
                      value={Number.isNaN(config.bitErrorRate) ? "" : config.bitErrorRate}
                      onChange={(event) => updateSetting("bitErrorRate", event.target.value)}
                    />
                    <span>p</span>
                  </span>
                </label>
              ) : (
                <div className="field-stack">
                  <p className="field-group-title">Gilbert–Elliott parameters</p>
                  <label className="field compact-field">
                    <span className="field-label">Good → bad transition</span>
                    <span className="input-suffix">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.001"
                        value={Number.isNaN(config.goodToBadProbability) ? "" : config.goodToBadProbability}
                        onChange={(event) =>
                          updateSetting("goodToBadProbability", event.target.value)
                        }
                      />
                      <span>pGB</span>
                    </span>
                  </label>
                  <label className="field compact-field">
                    <span className="field-label">Bad → good transition</span>
                    <span className="input-suffix">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.001"
                        value={Number.isNaN(config.badToGoodProbability) ? "" : config.badToGoodProbability}
                        onChange={(event) =>
                          updateSetting("badToGoodProbability", event.target.value)
                        }
                      />
                      <span>pBG</span>
                    </span>
                  </label>
                  <label className="field compact-field">
                    <span className="field-label">Bit error probability · good state</span>
                    <span className="input-suffix">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.0001"
                        value={Number.isNaN(config.goodStateErrorRate) ? "" : config.goodStateErrorRate}
                        onChange={(event) => updateSetting("goodStateErrorRate", event.target.value)}
                      />
                      <span>pG</span>
                    </span>
                  </label>
                  <label className="field compact-field">
                    <span className="field-label">Bit error probability · bad state</span>
                    <span className="input-suffix">
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.001"
                        value={Number.isNaN(config.badStateErrorRate) ? "" : config.badStateErrorRate}
                        onChange={(event) => updateSetting("badStateErrorRate", event.target.value)}
                      />
                      <span>pB</span>
                    </span>
                  </label>
                  <p className="inline-hint">
                    The channel starts in the good state and keeps its state between frames.
                  </p>
                </div>
              )}

              <div className="field-divider" />

              <label className="field">
                <span className="field-label">Payload length</span>
                <span className="field-help">Application data bits, before adding check bits.</span>
                <span className="input-suffix">
                  <input
                    type="number"
                    min="8"
                    max="4096"
                    step="1"
                    value={Number.isNaN(config.payloadBits) ? "" : config.payloadBits}
                    onChange={(event) => updateSetting("payloadBits", event.target.value)}
                  />
                  <span>bits</span>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Trials per scheme</span>
                <span className="field-help">More trials give more stable estimates.</span>
                <span className="input-suffix">
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    step="100"
                    value={Number.isNaN(config.trials) ? "" : config.trials}
                    onChange={(event) => updateSetting("trials", event.target.value)}
                  />
                  <span>frames</span>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Random seed</span>
                <span className="field-help">Keep the same seed to reproduce a run.</span>
                <input
                  className="plain-input"
                  type="number"
                  min="0"
                  max="4294967295"
                  step="1"
                  value={Number.isNaN(config.seed) ? "" : config.seed}
                  onChange={(event) => updateSetting("seed", event.target.value)}
                />
              </label>

              {errors.length > 0 && (
                <div className="error-box" role="alert">
                  <strong>Check the experiment settings</strong>
                  <ul>
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="run-button" type="submit" disabled={isRunning}>
                {isRunning ? (
                  <>
                    <span className="button-spinner" />
                    Running experiment…
                  </>
                ) : (
                  <>
                    Run simulation
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              {isRunning && (
                <div className="progress-area" aria-live="polite">
                  <div className="progress-label">
                    <span>{progress.schemeName}</span>
                    <span>
                      {progress.completed.toLocaleString()} / {progress.total.toLocaleString()}
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Simulation progress"
                    aria-valuenow={Math.round(progressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </form>

            <section className="scheme-card">
              <span className="eyebrow">Compared side by side</span>
              <h3>Five error checks</h3>
              <ul>
                <li><span className="scheme-dot parity" />Even parity <span>1 bit</span></li>
                <li><span className="scheme-dot checksum" />Internet checksum <span>16 bits</span></li>
                <li><span className="scheme-dot crc" />CRC-8 <span>8 bits</span></li>
                <li><span className="scheme-dot crc" />CRC-16 / CCITT-FALSE <span>16 bits</span></li>
                <li><span className="scheme-dot crc" />CRC-32 / BZIP2 <span>32 bits</span></li>
              </ul>
              <p>Every scheme sees the same payload sequence for a fair comparison.</p>
            </section>
          </aside>

          <section className="results-column">
            {result ? (
              <ResultsPanel
                results={result.results}
                config={result.config}
                completedAt={result.completedAt}
              />
            ) : (
              <section className="empty-state">
                <div className="empty-illustration" aria-hidden="true">
                  <div className="empty-document">
                    <span />
                    <span />
                    <span />
                    <div className="empty-mini-chart">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <span className="empty-spark spark-one">✦</span>
                  <span className="empty-spark spark-two">✦</span>
                </div>
                <span className="eyebrow">Your experiment workspace</span>
                <h2>Results will appear here</h2>
                <p>
                  Adjust the conditions on the left, then run a simulation to compare how each
                  detection scheme handles the same traffic and channel.
                </p>
                <div className="empty-detail-grid">
                  <div>
                    <strong>01</strong>
                    <span>Choose random or burst errors</span>
                  </div>
                  <div>
                    <strong>02</strong>
                    <span>Set packet size and trial count</span>
                  </div>
                  <div>
                    <strong>03</strong>
                    <span>Compare reliability and overhead</span>
                  </div>
                </div>
                <div className="default-scenario">
                  <span className="status-dot" />
                  Ready with a {getChannelLabel(config.channel).toLowerCase()} default scenario
                </div>
              </section>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}

export default App;
