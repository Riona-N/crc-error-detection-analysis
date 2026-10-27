import type { SchemeDefinition } from "./types";

export const SCHEMES: SchemeDefinition[] = [
  { id: "parity", name: "Even parity", checkBits: 1 },
  { id: "checksum", name: "Internet checksum", checkBits: 16 },
  { id: "crc8", name: "CRC-8", checkBits: 8 },
  { id: "crc16", name: "CRC-16/CCITT-FALSE", checkBits: 16 },
  { id: "crc32", name: "CRC-32/BZIP2", checkBits: 32 },
];

type CrcParameters = {
  width: 8 | 16 | 32;
  polynomial: number;
  initialValue: number;
  finalXor: number;
};

const CRC_PARAMETERS: Record<string, CrcParameters> = {
  crc8: {
    width: 8,
    polynomial: 0x07,
    initialValue: 0x00,
    finalXor: 0x00,
  },
  crc16: {
    width: 16,
    polynomial: 0x1021,
    initialValue: 0xffff,
    finalXor: 0x0000,
  },
  crc32: {
    width: 32,
    polynomial: 0x04c11db7,
    initialValue: 0xffffffff,
    finalXor: 0xffffffff,
  },
};

function integerToBits(value: number, bitCount: number): Uint8Array {
  const bits = new Uint8Array(bitCount);

  for (let index = 0; index < bitCount; index += 1) {
    const positionFromRight = bitCount - index - 1;
    bits[index] = (value >>> positionFromRight) & 1;
  }

  return bits;
}

function bitsToInteger(bits: Uint8Array): number {
  let value = 0;

  for (const bit of bits) {
    value = (value * 2 + bit) >>> 0;
  }

  return value;
}

function calculateCrc(payload: Uint8Array, parameters: CrcParameters): number {
  const { width, polynomial, initialValue, finalXor } = parameters;
  const topBit = 2 ** (width - 1);
  const mask = width === 32 ? 0xffffffff : 2 ** width - 1;
  let remainder = initialValue;

  for (const bit of payload) {
    const topBitWasSet = (remainder & topBit) !== 0;
    remainder = ((remainder * 2) & mask) >>> 0;

    if (topBitWasSet !== (bit === 1)) {
      remainder = (remainder ^ polynomial) >>> 0;
    }
  }

  return (remainder ^ finalXor) >>> 0;
}

function calculateInternetChecksum(payload: Uint8Array): number {
  let sum = 0;

  for (let start = 0; start < payload.length; start += 16) {
    let word = 0;

    for (let offset = 0; offset < 16; offset += 1) {
      const bitIndex = start + offset;
      word = word * 2 + (bitIndex < payload.length ? payload[bitIndex] : 0);
    }

    sum += word;
    sum = (sum & 0xffff) + Math.floor(sum / 0x10000);
  }

  return (~sum) & 0xffff;
}

function isValidInternetChecksum(receivedPayload: Uint8Array, receivedCheck: Uint8Array): boolean {
  return calculateInternetChecksum(receivedPayload) === bitsToInteger(receivedCheck);
}

export function createCheckBits(schemeId: string, payload: Uint8Array): Uint8Array {
  if (schemeId === "parity") {
    let parity = 0;

    for (const bit of payload) {
      parity ^= bit;
    }

    return Uint8Array.of(parity);
  }

  if (schemeId === "checksum") {
    return integerToBits(calculateInternetChecksum(payload), 16);
  }

  const parameters = CRC_PARAMETERS[schemeId];

  if (!parameters) {
    throw new Error(`Unknown error-detection scheme: ${schemeId}`);
  }

  const remainder = calculateCrc(payload, parameters);
  return integerToBits(remainder, parameters.width);
}

export function detectsCorruption(
  schemeId: string,
  receivedPayload: Uint8Array,
  receivedCheck: Uint8Array,
): boolean {
  if (schemeId === "parity") {
    let parity = 0;

    for (const bit of receivedPayload) {
      parity ^= bit;
    }

    return parity !== receivedCheck[0];
  }

  if (schemeId === "checksum") {
    return !isValidInternetChecksum(receivedPayload, receivedCheck);
  }

  const parameters = CRC_PARAMETERS[schemeId];

  if (!parameters) {
    throw new Error(`Unknown error-detection scheme: ${schemeId}`);
  }

  const expectedCheck = createCheckBits(schemeId, receivedPayload);

  if (expectedCheck.length !== receivedCheck.length) {
    throw new Error(`Invalid check-field length for ${schemeId}.`);
  }

  for (let index = 0; index < expectedCheck.length; index += 1) {
    if (expectedCheck[index] !== receivedCheck[index]) {
      return true;
    }
  }

  return false;
}
