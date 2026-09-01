import protobuf from "protobufjs";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type {
  StreamCppRequest,
  StreamCppResult,
  ProtoType,
} from "../types/proto";
import { defaultStreamCppPayload } from "./constants";
import {
  CURSOR_BEARER_TOKEN,
  X_CURSOR_CLIENT_VERSION,
  X_REQUEST_ID,
  X_SESSION_ID,
} from "../env";

async function sendStreamCppRequest(
  code: string = "function",
): Promise<string> {
  const token = CURSOR_BEARER_TOKEN;
  if (!token || token === "undefined") {
    console.error(
      "Missing CURSOR_BEARER_TOKEN. dotenv loaded 0 vars; set it in your shell or .env.",
    );
    process.exit(1);
  }

  const newPayload = { ...defaultStreamCppPayload };
  newPayload.currentFile.contents = code;

  console.log("New Code:", code);
  const requestRoot = await protobuf.load(
    "./protobuf/cursor/streamCppRequest.proto",
  );
  const Request = requestRoot.lookupType(
    "aiserver.v1.StreamCppRequest",
  ) as unknown as ProtoType;

  const responseRoot = await protobuf.load(
    "./protobuf/cursor/streamCppResponse.proto",
  );
  const Response = responseRoot.lookupType(
    "aiserver.v1.StreamCppResponse",
  ) as unknown as ProtoType;

  const payload: StreamCppRequest = newPayload;

  const protoBuffer = Buffer.from(
    Request.encode(Request.create(payload)).finish(),
  );

  const envelope = Buffer.alloc(5 + protoBuffer.length);
  envelope.writeUInt8(0, 0);
  envelope.writeUInt32BE(protoBuffer.length, 1);
  protoBuffer.copy(envelope, 5);

  const url = new URL(
    "https://us-only.gcpp.cursor.sh:443/aiserver.v1.AiService/StreamCpp",
  );

  const options: https.RequestOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: "POST",
    headers: {
      "connect-accept-encoding": "gzip",
      "connect-content-encoding": "gzip",
      "connect-protocol-version": "1",
      "content-type": "application/connect+proto",
      "x-cursor-client-type": "ide",
      "x-cursor-client-version": X_CURSOR_CLIENT_VERSION ?? "",
      "x-cursor-streaming": "true",
      "x-request-id": X_REQUEST_ID ?? "",
      "x-session-id": X_SESSION_ID ?? "",
      Authorization: `Bearer ${token}`,
      "Content-Length": envelope.length,
    },
  };

  return new Promise<string>((resolve, reject) => {
    const req = https.request(options, (res: IncomingMessage) => {
      let dataBuffer = Buffer.alloc(0);

      // Collect all stream data
      const result: StreamCppResult = {
        status: res.statusCode,
        contentType: res.headers["content-type"] ?? "",
        modelInfo: null,
        rangeToReplace: null,
        text: "",
        doneEdit: false,
        doneStream: false,
        debug: null,
        trailer: null,
        error: null,
      };

      res.on("data", (chunk: Buffer) => {
        dataBuffer = Buffer.concat([dataBuffer, chunk]);

        // Parse Connect protocol envelopes: 1 byte flags + 4 bytes length + message
        while (dataBuffer.length >= 5) {
          const flags = dataBuffer.readUInt8(0);
          const msgLen = dataBuffer.readUInt32BE(1);

          // Check if we have the full message
          if (dataBuffer.length < 5 + msgLen) {
            break; // Wait for more data
          }

          const msgData = dataBuffer.slice(5, 5 + msgLen);
          dataBuffer = dataBuffer.slice(5 + msgLen);

          // flags & 0x02 means it's a trailer/end-stream frame (JSON)
          if (flags & 0x02) {
            try {
              result.trailer = JSON.parse(msgData.toString("utf8")) as unknown;
            } catch {
              result.trailer = msgData.toString("utf8");
            }
            continue;
          }

          // Regular data frame - decode protobuf
          try {
            const decoded = Response.decode(msgData) as any;

            // Protobuf fields are in snake_case, map them to camelCase
            // Handle both snake_case (from proto) and camelCase (if protobufjs converts)
            if (decoded.model_info || decoded.modelInfo) {
              const modelInfo = decoded.model_info || decoded.modelInfo;
              result.modelInfo = {
                isFusedCursorPredictionModel:
                  modelInfo.is_fused_cursor_prediction_model ??
                  modelInfo.isFusedCursorPredictionModel ??
                  false,
                isMultidiffModel:
                  modelInfo.is_multidiff_model ??
                  modelInfo.isMultidiffModel ??
                  false,
              };
            }
            if (decoded.range_to_replace || decoded.rangeToReplace) {
              const range = decoded.range_to_replace || decoded.rangeToReplace;
              result.rangeToReplace = {
                startLine: range.start_line ?? range.startLine ?? 0,
                startColumn: range.start_column ?? range.startColumn ?? 0,
                endLine: range.end_line ?? range.endLine ?? 0,
                endColumn: range.end_column ?? range.endColumn ?? 0,
              };
            }
            if (decoded.text) {
              result.text += decoded.text;
            }
            if (
              decoded.done_edit !== undefined ||
              decoded.doneEdit !== undefined
            ) {
              result.doneEdit = decoded.done_edit ?? decoded.doneEdit ?? false;
            }
            if (
              decoded.done_stream !== undefined ||
              decoded.doneStream !== undefined
            ) {
              result.doneStream =
                decoded.done_stream ?? decoded.doneStream ?? false;
            }
            if (
              decoded.debug_model_output ||
              decoded.debugStreamTime ||
              decoded.debug_model_input ||
              decoded.debug_ttft_time ||
              decoded.debugModelOutput ||
              decoded.debugStreamTime ||
              decoded.debugModelInput ||
              decoded.debugTtftTime
            ) {
              result.debug = {
                modelOutput:
                  decoded.debug_model_output ?? decoded.debugModelOutput,
                modelInput:
                  decoded.debug_model_input ?? decoded.debugModelInput,
                streamTime:
                  decoded.debug_stream_time ?? decoded.debugStreamTime,
                ttftTime: decoded.debug_ttft_time ?? decoded.debugTtftTime,
              };
            }
          } catch (e) {
            const error = e as Error;
            result.error = error.message;
            console.error("Decode error:", error.message);
          }
        }
      });

      res.on("end", () => {
        // Handle any remaining data as error response
        if (dataBuffer.length > 0) {
          const contentType = res.headers["content-type"] ?? "";
          if (
            contentType.includes("application/json") ||
            dataBuffer[0] === 0x7b
          ) {
            try {
              result.error = JSON.parse(dataBuffer.toString("utf8")) as unknown;
            } catch {
              result.error = dataBuffer.toString("utf8");
            }
          } else {
            // Try to parse remaining buffer as protobuf
            try {
              const decoded = Response.decode(dataBuffer) as any;
              if (decoded.text) result.text += decoded.text;
              if (
                decoded.done_edit !== undefined ||
                decoded.doneEdit !== undefined
              ) {
                result.doneEdit =
                  decoded.done_edit ?? decoded.doneEdit ?? false;
              }
              if (
                decoded.done_stream !== undefined ||
                decoded.doneStream !== undefined
              ) {
                result.doneStream =
                  decoded.done_stream ?? decoded.doneStream ?? false;
              }
            } catch {
              // Ignore decode errors for remaining buffer
            }
          }
        }

        // Check for error status codes
        if (res.statusCode && res.statusCode >= 400) {
          result.error = result.error || `HTTP ${res.statusCode}`;
        }

        // Return final JSON - always return something
        try {
          const jsonResult = JSON.stringify(result, null, 2);
          if (!jsonResult || jsonResult.trim().length === 0) {
            console.warn("JSON stringify returned empty, using fallback");
            resolve(
              JSON.stringify(
                { error: "Empty response", status: res.statusCode },
                null,
                2,
              ),
            );
          } else {
            console.log(
              "Resolving with JSON (length:",
              jsonResult.length + ")",
            );
            resolve(jsonResult);
          }
        } catch (stringifyError) {
          console.error("JSON stringify error:", stringifyError);
          resolve(
            JSON.stringify(
              { error: "Failed to stringify result", raw: result },
              null,
              2,
            ),
          );
        }
      });

      res.on("error", (err: Error) => {
        result.error = err.message;
        try {
          const jsonResult = JSON.stringify(result, null, 2);
          console.log(
            "Resolving with error JSON (length:",
            jsonResult.length + ")",
          );
          resolve(jsonResult);
        } catch (stringifyError) {
          console.error(
            "JSON stringify error in error handler:",
            stringifyError,
          );
          resolve(JSON.stringify({ error: err.message }, null, 2));
        }
      });
    });

    req.on("error", (err: Error) => {
      console.error("Request error:", err.message);
      const errorResult = JSON.stringify({ error: err.message }, null, 2);
      reject(new Error(errorResult));
    });

    req.write(envelope);
    req.end();
  });
}

export default sendStreamCppRequest;
