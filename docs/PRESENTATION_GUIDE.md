# Professor demonstration guide

## Suggested 5–7 minute walkthrough

### 1. State the research gap

Existing work often studies CRC computation speed separately from error-detection strength, relies on idealized random errors, or does not compare multiple checks under common conditions. This demo brings the schemes, two channel models, packet overhead, and basic retransmission implications into one controlled experiment.

### 2. Establish the baseline

Open the app and point out that it runs in the browser without sending traffic to a network. Keep the displayed defaults:

- Binary symmetric channel
- 256-bit payload
- 5,000 frames per scheme
- Bit error probability `0.001`
- Seed `20261027`

Run the experiment. Explain that all checks receive the same payload sequence and that the seed makes the run repeatable.

### 3. Explain the outputs

- Start with **undetected errors per transmitted frame**: lower means fewer corrupted frames passed by the check in this run.
- Compare **detection rate** only after checking how many frames were corrupted. N/A means no corrupted frames were observed.
- Use **overhead** to show the cost of adding a fixed number of check bits, especially for short packets.
- Explain the ARQ retry estimate as a simple model based on the measured detected-error outcomes—not a complete transport or link protocol.
- Point out that browser computation time is indicative, not a hardware benchmark.

### 4. Change packet size

Run with payloads of 64, 256, and 1,024 bits while keeping channel settings and seed constant. Ask how fixed check-field sizes change as a fraction of payload. Report all settings with screenshots or copied table values when preparing a final report.

### 5. Show burst errors

Select **Burst errors**. The defaults use a lower error rate in the good state, a higher error rate in the bad state, and transitions between those states. Run and explain that the channel's state continues from bit to bit and across frame boundaries; the same channel realization is not shared across schemes.

For a useful controlled follow-up, alter one Gilbert–Elliott parameter at a time. For example, reduce the bad-to-good transition probability to lengthen bad periods, then compare the results while keeping seed, payload size, trial count, and the other probabilities unchanged.

## Suggested conclusion

Summarize what the measured outputs show for the tested settings, not for all possible networks. A scheme with no observed misses in a finite run still has no demonstrated zero error probability. For a stronger study, increase trials, include confidence intervals, document repeat runs, and compare the simulator against independently validated CRC/checksum test vectors.

## Live-demo tips

- Run the BSC and burst experiment once before presenting to confirm the browser and local dev server are ready.
- If rare undetected errors do not appear, explain that the trial count is finite. Do not claim that a measured zero means a scheme can never miss an error.
- Keep trial count moderate during a live presentation. The app allows up to 50,000 trials per scheme, but a larger run takes longer.
- Mention that idealized goodput does not include ACKs, propagation delay, protocol windowing, or timeout behavior.
- Use `README.md` for startup steps and `METHODOLOGY.md` for the precise algorithm parameters, equations, and limitations.
