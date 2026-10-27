# Simulation methodology

## Research question addressed

This implementation makes a controlled, repeatable comparison of detection capability, check-bit overhead, and processing time for parity, checksum, and CRC variants. It tests both independent random bit errors and correlated burst errors, and reports simple ARQ-related estimates. This directly reflects the project objectives in the supplied problem statement.

## Compared checks

| Scheme | Check-field size | Definition used |
|---|---:|---|
| Even parity | 1 bit | XOR of payload bits; the receiver checks even parity over the payload and transmitted parity bit. |
| Internet checksum | 16 bits | One's-complement sum of 16-bit words, with a final partial word padded on the right with zero bits; the complement is transmitted. |
| CRC-8 | 8 bits | Width 8, polynomial `0x07`, initial value `0x00`, final XOR `0x00`, non-reflected bit processing. |
| CRC-16/CCITT-FALSE | 16 bits | Width 16, polynomial `0x1021`, initial value `0xFFFF`, final XOR `0x0000`, non-reflected bit processing. |
| CRC-32/BZIP2 | 32 bits | Width 32, polynomial `0x04C11DB7`, initial value `0xFFFFFFFF`, final XOR `0xFFFFFFFF`, non-reflected bit processing. |

For each trial, the sender generates a random payload, computes the scheme's check field, and transmits payload plus check field. The receiver separates the received payload and check field and validates them. A frame is *corrupted* if any transmitted payload or check bit flips. Corrupted frames are then counted as detected or undetected. Clean frames are counted separately.

The checksum is computed from the received payload and compared using one's-complement arithmetic with the received 16-bit check field. CRC checks recompute the stated CRC over the received payload and compare it with the received CRC field. Check bits are displayed and transmitted most-significant bit first.

## Channel models

### Binary symmetric channel (BSC)

Each transmitted bit independently flips with configured probability `p`. This is a binary symmetric channel; it does not model fading, interference, or dependencies between errors.

### Gilbert–Elliott two-state channel

The channel has a **good** state and a **bad** state. Before each transmitted bit, it may change state:

- Good to bad with probability `pGB`.
- Bad to good with probability `pBG`.
- In the good state, the bit flips with probability `pG`.
- In the bad state, the bit flips with probability `pB`.

The simulation begins in the good state and carries its state across frame boundaries. The selected state controls whether each bit flips; both payload and check bits pass through the same channel. Choose `pB` at least as large as `pG` to represent a worse bad state. This is a simple two-state burst-error model, not a fitted radio/network trace.

## Reproducibility and comparison

The interface accepts an unsigned 32-bit seed. A deterministic pseudo-random generator initializes each scheme's channel stream; the payload stream is also deterministic. All five schemes receive the same payload sequence for a given run, while separate deterministic channel streams prevent one scheme's longer check field from shifting another scheme's random bit draws. Repeating the same inputs and seed with the same app version reproduces the same counts.

Each result is based on the configured number of complete frames **per scheme**. An experiment with 5,000 trials therefore sends 25,000 total simulated frames across the five separate comparisons.

## Metrics

Let `N` be transmitted frames; `C` be corrupted frames; `D` be corrupted frames detected; `U` be corrupted frames not detected; and `Q` be clean frames. Thus `C = D + U` and `N = Q + C`.

- **Detection rate among corrupted frames**: `D / C`. Undefined when `C = 0`; the UI displays N/A.
- **Undetected-error probability per transmitted frame**: `U / N`.
- **Conditional miss rate**: `U / C`. This is related to, but different from, undetected-error probability per transmitted frame. The interface shows `C` (corrupted-frame count), `U` (undetected-frame count), and `U / N`; detection rate is `D / C`.
- **Redundancy overhead**: `check bits / payload bits`, shown as a percentage.
- **Browser computation time**: elapsed time to generate payloads, compute checks, simulate the channel, and validate frames for that scheme. Rendering and initial page setup are outside the measured interval.
- **Expected ARQ retransmissions per accepted frame**: `D / (Q + U)`, or N/A if no frame would be accepted. A corrupted frame that evades detection is treated as accepted, not retransmitted. This is a stationary estimate based on aggregate outcomes; for the Gilbert–Elliott channel it does not condition retransmission behavior on the current channel state.
- **Idealized clean goodput**: `(payload bits / frame bits) × (Q / N)`, shown as a percentage of the bit rate available to complete frames. This counts only clean frames as useful payload and includes check bits in frame size. It does not model real retransmission timing, ACKs, windows, timeout behavior, or retransmission limits.

The application summary gives the total number of undetected errors summed across the five runs; the per-scheme table is the proper place to compare schemes.

## Interpretation cautions

1. A measured count of zero undetected errors does not establish a zero true probability. State the trial count and, where possible, report a confidence interval in a formal report.
2. Detection rates can be misleading if the run has very few corrupted frames. Check `C`, not just the percentage.
3. Rare events need far more frames than the default 5,000. Increase trials gradually; the upper limit is 50,000 per scheme for browser responsiveness.
4. Each scheme's seeded channel stream is deterministic but separate. The experiment controls payload input, not every flipped bit across differing frame lengths.
5. CRC parameters and bit ordering are explicitly specified above because the names “CRC-8”, “CRC-16”, and “CRC-32” alone do not uniquely identify an algorithm.
6. The Internet checksum's behavior depends on word boundaries and byte ordering in deployed protocols. This bit-level simulator uses 16-bit words formed from payload bits and right-pads the final partial word.
7. Computation times depend on the browser, processor, background work, and just-in-time compilation. Use them only as same-device indicative measurements.
8. The BSC and Gilbert–Elliott models do not represent real network traces. The ARQ outputs are analytical estimates from simulated frame outcomes; they are not a full stop-and-wait, Go-Back-N, or Selective Repeat implementation.

## Validation ideas

- Use `p = 0` on the BSC to confirm every frame is clean, detection rate is N/A, and undetected error probability is zero.
- Use a high BSC error probability to produce many corrupted frames, then compare detection and miss counts.
- Compare short and long payloads to see check-field overhead decrease as payload grows.
- Compare low bad-state exit probability (longer bursts) with high bad-state exit probability (shorter bursts), while keeping other parameters fixed.
- Repeat each test with the same seed to check reproducibility.
