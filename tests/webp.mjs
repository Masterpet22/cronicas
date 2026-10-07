import assert from "node:assert/strict";

export function webpDimensions(buffer, label) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", `${label} debe ser un contenedor RIFF`);
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP", `${label} debe usar el formato WebP`);

  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
      alpha: Boolean(buffer[20] & 0x10)
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      alpha: false
    };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      alpha: Boolean((bits >> 28) & 1)
    };
  }
  assert.fail(`${label} usa un bloque WebP no reconocido: ${chunk}`);
}
