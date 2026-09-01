import { brotliDecompressSync, gunzipSync } from "node:zlib";

export function encodeConnectEnvelope(message: Uint8Array): Buffer {
  const body = Buffer.from(message);
  const envelope = Buffer.allocUnsafe(body.length + 5);
  envelope.writeUInt8(0, 0);
  envelope.writeUInt32BE(body.length, 1);
  body.copy(envelope, 5);
  return envelope;
}

export function decompressConnectMessage(
  message: Uint8Array,
  encoding: string | undefined,
): Buffer<ArrayBuffer> {
  if (encoding === "gzip") return gunzipSync(message);
  if (encoding === "br") return brotliDecompressSync(message);
  return Buffer.from(message);
}
