# LinkLab: Error Detection Simulator

LinkLab is a local, browser-based Computer Networks project demonstration. It compares even parity, the 16-bit Internet checksum, CRC-8, CRC-16/CCITT-FALSE, and CRC-32/BZIP2 under a binary symmetric channel (random independent bit errors) or a two-state Gilbert–Elliott channel (bursty errors).

The interface reports detection performance, undetected corrupt frames, check-bit overhead, estimated ARQ retransmissions, an idealized goodput estimate, and browser-side processing time. Simulation is performed locally; no packets are sent and no application data leaves the browser.

## Requirements

- Node.js 20.19+ or 22.12+ (Node.js 24 is also suitable)
- npm
- A current desktop browser

## Run the application

Open a terminal in the project folder and run:

```powershell
npm install
npm run dev
```

Vite prints a local URL, normally `http://localhost:5173/`. Open that URL in a browser. Keep the terminal running while you use the app.

For a production build:

```powershell
npm run build
npm run preview
```

The production files are written to `dist/`. The preview command prints a local URL for checking that build.

Run the focused algorithm and simulation regression tests with:

```powershell
npm test
```

## Run a first experiment

1. Leave **Random errors** selected.
2. Keep the default values: payload 256 bits, 5,000 frames per scheme, seed `20261027`, and BSC bit error probability `0.001`.
3. Select **Run simulation** and wait for the progress indicator to finish.
4. Review the charts and comparison table. The seed and settings are shown with the results.
5. Run again without changing the inputs to verify that the exact same counts are reproduced.
6. Select **Burst errors** and run the Gilbert–Elliott scenario with the default transition and per-state error probabilities.
7. Change the payload length (for example 64, 256, and 1,024 bits) to observe how fixed check-bit overhead changes with packet size.

The app validates input ranges before starting. Payload lengths must be 8–4,096 bits, trials 100–50,000, and probabilities 0–1. For a useful classroom demonstration, use at least 5,000 frames per scheme; rare undetected events require many more trials to estimate reliably.

## What the outputs mean

- **Detection rate** is the number of corrupted frames flagged by the check, divided by all corrupted frames. It is shown as N/A when a run contains no corrupted frames.
- **Undetected errors per frame** is the number of corrupted frames accepted by the check, divided by the number of transmitted frames. A measured zero is not proof that the true probability is zero.
- **Overhead** is the number of check bits divided by payload bits. It does not include headers or link-layer framing.
- **Expected ARQ retries** is the number of detected-error frames divided by frames that would be accepted (clean plus undetected) under the run's measured error distribution. It assumes repeat transmissions follow the same frame-error distribution.
- **Idealized goodput** is the payload fraction of the frame multiplied by the measured clean-frame probability. It excludes ACK timing, propagation delay, windowing, timeouts, retransmission limits, and other real protocol behavior.
- **Time** measures browser-side payload generation, check computation, simulated transmission, and validation. It is a same-browser experiment metric, not a hardware benchmark.

For parameter definitions, algorithm details, assumptions, and limitations, see [docs/METHODOLOGY.md](docs/METHODOLOGY.md). For a suggested professor demonstration and result interpretation, see [docs/PRESENTATION_GUIDE.md](docs/PRESENTATION_GUIDE.md).

## Project structure

```text
src/
  App.tsx                    Main interface and experiment controls
  components/
    ResultsCharts.tsx        Accessible SVG comparison charts
    ResultsPanel.tsx         Summary, table, and metric explanations
  model/
    checksums.ts             Parity, Internet checksum, and CRC implementations
    random.ts                Seeded reproducible pseudo-random generator
    simulation.ts            Channel models and trial runner
    types.ts                 Shared TypeScript data types
  styles.css                 Responsive application styling
docs/
  METHODOLOGY.md             Algorithms, model definitions, and limitations
  PRESENTATION_GUIDE.md      Demonstration scenario and explanation guide
```
