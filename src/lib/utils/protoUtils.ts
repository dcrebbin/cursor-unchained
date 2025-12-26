import protobuf, { Message } from "protobufjs";
import type {
  StreamCppResult,
  ModelInfo,
  RangeToReplace,
} from "../types/proto";

/**
 * Gets a field from a decoded protobuf message, handling both snake_case and camelCase
 */
export function getField<T>(
  obj: Record<string, unknown>,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key] as T;
  }
  return undefined;
}

/**
 * Gets a nested object field, handling both snake_case and camelCase naming
 */
export function getNestedField(
  obj: Record<string, unknown>,
  snakeKey: string,
  camelKey: string
): Record<string, unknown> | undefined {
  return (obj[snakeKey] || obj[camelKey]) as
    | Record<string, unknown>
    | undefined;
}

/**
 * Parse ModelInfo from decoded protobuf, normalizing field names
 */
export function parseModelInfo(
  decoded: Record<string, unknown>
): ModelInfo | null {
  const modelInfo = getNestedField(decoded, "model_info", "modelInfo");
  if (!modelInfo) return null;

  return {
    isFusedCursorPredictionModel:
      getField<boolean>(
        modelInfo,
        "is_fused_cursor_prediction_model",
        "isFusedCursorPredictionModel"
      ) ?? false,
    isMultidiffModel:
      getField<boolean>(modelInfo, "is_multidiff_model", "isMultidiffModel") ??
      false,
  };
}

/**
 * Parse RangeToReplace from decoded protobuf, normalizing field names
 */
export function parseRangeToReplace(
  decoded: Record<string, unknown>
): RangeToReplace | null {
  const range = getNestedField(decoded, "range_to_replace", "rangeToReplace");
  if (!range) return null;

  return {
    startLine: getField<number>(range, "start_line", "startLine") ?? 0,
    startColumn: getField<number>(range, "start_column", "startColumn") ?? 0,
    endLine: getField<number>(range, "end_line", "endLine") ?? 0,
    endColumn: getField<number>(range, "end_column", "endColumn") ?? 0,
  };
}

/**
 * Parse debug fields from decoded protobuf
 */
export function parseDebugInfo(
  decoded: Record<string, unknown>
): StreamCppResult["debug"] {
  const hasDebug =
    decoded.debug_model_output !== undefined ||
    decoded.debug_model_input !== undefined ||
    decoded.debug_stream_time !== undefined ||
    decoded.debug_ttft_time !== undefined ||
    decoded.debugModelOutput !== undefined ||
    decoded.debugModelInput !== undefined ||
    decoded.debugStreamTime !== undefined ||
    decoded.debugTtftTime !== undefined;

  if (!hasDebug) return null;

  return {
    modelOutput: getField<string>(
      decoded,
      "debug_model_output",
      "debugModelOutput"
    ),
    modelInput: getField<string>(
      decoded,
      "debug_model_input",
      "debugModelInput"
    ),
    streamTime: getField<string>(
      decoded,
      "debug_stream_time",
      "debugStreamTime"
    ),
    ttftTime: getField<string>(decoded, "debug_ttft_time", "debugTtftTime"),
  };
}

/**
 * Parse boolean field with snake_case/camelCase handling
 */
export function parseBoolField(
  decoded: Record<string, unknown>,
  snakeKey: string,
  camelKey: string
): boolean | undefined {
  if (decoded[snakeKey] !== undefined || decoded[camelKey] !== undefined) {
    return (decoded[snakeKey] ?? decoded[camelKey] ?? false) as boolean;
  }
  return undefined;
}

/**
 * Apply decoded protobuf message to StreamCppResult
 */
export function applyDecodedToResult(
  decoded: Record<string, unknown>,
  result: StreamCppResult
): void {
  // Model info
  const modelInfo = parseModelInfo(decoded);
  if (modelInfo) result.modelInfo = modelInfo;

  // Range to replace
  const range = parseRangeToReplace(decoded);
  if (range) result.rangeToReplace = range;

  // Text (accumulate)
  if (decoded.text) result.text += decoded.text;

  // Boolean flags
  const doneEdit = parseBoolField(decoded, "done_edit", "doneEdit");
  if (doneEdit !== undefined) result.doneEdit = doneEdit;

  const doneStream = parseBoolField(decoded, "done_stream", "doneStream");
  if (doneStream !== undefined) result.doneStream = doneStream;

  // Debug info
  const debug = parseDebugInfo(decoded);
  if (debug) result.debug = debug;
}

export interface ProtoDecoder {
  decode(buffer: Uint8Array | Buffer): Message;
}

export interface ConnectEnvelope {
  flags: number;
  data: Uint8Array;
  isTrailer: boolean;
}

/**
 * Parse Connect protocol envelopes from a buffer.
 * Returns parsed envelopes and remaining buffer.
 */
export function parseConnectEnvelopes(buffer: Uint8Array): {
  envelopes: ConnectEnvelope[];
  remaining: Uint8Array;
} {
  const envelopes: ConnectEnvelope[] = [];
  let pos = 0;
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );

  while (buffer.length - pos >= 5) {
    const flags = view.getUint8(pos);
    const msgLen = view.getUint32(pos + 1, false); // big-endian

    if (buffer.length - pos < 5 + msgLen) {
      break; // Wait for more data
    }

    const data = buffer.subarray(pos + 5, pos + 5 + msgLen);
    envelopes.push({
      flags,
      data,
      isTrailer: (flags & 0x02) !== 0,
    });

    pos += 5 + msgLen;
  }

  return {
    envelopes,
    remaining: buffer.subarray(pos),
  };
}

/**
 * Parse trailer JSON from envelope data
 */
export function parseTrailer(data: Uint8Array): unknown {
  const text = new TextDecoder().decode(data);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Create initial StreamCppResult with HTTP response info
 */
export function createStreamResult(
  statusCode: number | undefined,
  contentType: string
): StreamCppResult {
  return {
    status: statusCode,
    contentType,
    modelInfo: null,
    rangeToReplace: null,
    text: "",
    doneEdit: false,
    doneStream: false,
    debug: null,
    trailer: null,
    error: null,
  };
}

/**
 * Try to parse buffer as JSON error response
 */
export function tryParseJsonError(
  buffer: Buffer,
  contentType: string
): unknown | null {
  if (buffer.length === 0) return null;

  if (contentType.includes("application/json") || buffer[0] === 0x7b) {
    try {
      return JSON.parse(buffer.toString("utf8"));
    } catch {
      return buffer.toString("utf8");
    }
  }
  return null;
}

/**
 * Create Connect protocol envelope for request
 */
export function createConnectEnvelope(protoBuffer: Buffer): Buffer {
  const envelope = Buffer.alloc(5 + protoBuffer.length);
  envelope.writeUInt8(0, 0);
  envelope.writeUInt32BE(protoBuffer.length, 1);
  protoBuffer.copy(envelope, 5);
  return envelope;
}

/**
 * Load protobuf types for request and response
 */
export async function loadProtoTypes(
  requestProtoPath: string,
  requestTypeName: string,
  responseProtoPath: string,
  responseTypeName: string
): Promise<{ Request: ProtoDecoder; Response: ProtoDecoder }> {
  const [requestRoot, responseRoot] = await Promise.all([
    protobuf.load(requestProtoPath),
    protobuf.load(responseProtoPath),
  ]);

  return {
    Request: requestRoot.lookupType(requestTypeName) as unknown as ProtoDecoder,
    Response: responseRoot.lookupType(
      responseTypeName
    ) as unknown as ProtoDecoder,
  };
}

/**
 * Safely stringify result to JSON
 */
export function safeStringify(
  result: StreamCppResult,
  statusCode?: number
): string {
  try {
    const json = JSON.stringify(result, null, 2);
    if (json && json.trim().length > 0) {
      return json;
    }
    console.warn("JSON stringify returned empty, using fallback");
    return JSON.stringify(
      { error: "Empty response", status: statusCode },
      null,
      2
    );
  } catch (err) {
    console.error("JSON stringify error:", err);
    return JSON.stringify({ error: "Failed to stringify result" }, null, 2);
  }
}
