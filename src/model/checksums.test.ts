import { describe, expect, it } from "vitest";
import { createCheckBits, detectsCorruption } from "./checksums";

function textToBits(text: string): Uint8Array {
  const bits: number[] = [];

  for (const character of text) {
    const byte = character.charCodeAt(0);

    for (let position = 7; position >= 0; position -= 1) {
      bits.push((byte >>> position) & 1);
    }
  }

  return Uint8Array.from(bits);
}

function bitsToHex(bits: Uint8Array): string {
  let value = 0;

  for (const bit of bits) {
    value = (value * 2 + bit) >>> 0;
  }

  return value.toString(16).padStart(bits.length / 4, "0").toUpperCase();
}

function flipBit(bits: Uint8Array, position: number): Uint8Array {
  const changedBits = new Uint8Array(bits);
  changedBits[position] ^= 1;
  return changedBits;
}

describe("CRC parameter sets", () => {
  const standardCheckInput = textToBits("123456789");

  it("matches the CRC-8 check value", () => {
    expect(bitsToHex(createCheckBits("crc8", standardCheckInput))).toBe("F4");
  });

  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(bitsToHex(createCheckBits("crc16", standardCheckInput))).toBe("29B1");
  });

  it("matches the CRC-32/BZIP2 check value", () => {
    expect(bitsToHex(createCheckBits("crc32", standardCheckInput))).toBe("FC891918");
  });
});

describe("error detection checks", () => {
  const payload = textToBits("link-layer-frame");

  it("accepts an unchanged frame for each scheme", () => {
    for (const schemeId of ["parity", "checksum", "crc8", "crc16", "crc32"]) {
      const checkBits = createCheckBits(schemeId, payload);

      expect(detectsCorruption(schemeId, payload, checkBits)).toBe(false);
    }
  });

  it("detects a single flipped payload bit for each scheme", () => {
    for (const schemeId of ["parity", "checksum", "crc8", "crc16", "crc32"]) {
      const checkBits = createCheckBits(schemeId, payload);
      const changedPayload = flipBit(payload, 3);

      expect(detectsCorruption(schemeId, changedPayload, checkBits)).toBe(true);
    }
  });

  it("detects a single flipped checksum bit", () => {
    const checkBits = createCheckBits("checksum", payload);
    const changedCheck = flipBit(checkBits, 7);

    expect(detectsCorruption("checksum", payload, changedCheck)).toBe(true);
  });

  it("demonstrates parity's known miss for an even number of bit flips", () => {
    const checkBits = createCheckBits("parity", payload);
    const changedPayload = flipBit(flipBit(payload, 2), 5);

    expect(detectsCorruption("parity", changedPayload, checkBits)).toBe(false);
  });
});
