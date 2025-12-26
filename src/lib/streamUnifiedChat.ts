import { spawn } from "node:child_process";
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  ProtoType,
  StreamUnifiedChatRequest,
  StreamUnifiedChatRequestWithTools,
} from "./types/proto";
import { defaultChatPanePayload } from "./constants";
import {
  CURSOR_BEARER_TOKEN,
  X_CURSOR_CLIENT_VERSION,
  X_REQUEST_ID,
  X_SESSION_ID,
} from "./env";
import {
  loadProtoTypes,
  createConnectEnvelope,
  parseConnectEnvelopes,
  parseTrailer,
  createStreamResult,
  applyDecodedToResult,
  safeStringify,
  parseBoolField,
} from "./utils/protoUtils";

async function sendStreamUnifiedChatRequest(
  message: string = "hey"
): Promise<string> {
  const token = CURSOR_BEARER_TOKEN;
  if (!token || token === "undefined") {
    console.error(
      "Missing CURSOR_BEARER_TOKEN. dotenv loaded 0 vars; set it in your shell or .env."
    );
    process.exit(1);
  }
  // Try a minimal request first
  // type: 1 = MESSAGE_TYPE_HUMAN (enum value)
  const minimalRequest: StreamUnifiedChatRequest = {
    conversation: [
      {
        text: message,
        type: 1, // MESSAGE_TYPE_HUMAN enum value
        bubbleId: "test-bubble-id",
      },
    ],
    conversationId: "test-conversation-id",
    isAgentic: false,
    isChat: true,
  };

  const newPayload: StreamUnifiedChatRequestWithTools = {
    streamUnifiedChatRequest: minimalRequest,
  };

  console.log("New Message:", message);

  const { Request, Response } = await loadProtoTypes(
    "./protobuf/streamUnifiedChatRequestWithTools.proto",
    "aiserver.v1.StreamUnifiedChatRequestWithTools",
    "./protobuf/streamUnifiedChatResponseWithTools.proto",
    "aiserver.v1.StreamUnifiedChatResponseWithTools"
  );

  const payload: StreamUnifiedChatRequestWithTools = newPayload;
  const RequestType = Request as unknown as ProtoType;
  const created = RequestType.create(payload);
  const protoBuffer = Buffer.from(RequestType.encode(created).finish());

  // Create envelope without compression
  const envelope = createConnectEnvelope(protoBuffer, false);

  // Write to a temp file for curl to read
  const tmpFile = path.join(os.tmpdir(), `cursor-request-${Date.now()}.bin`);
  fs.writeFileSync(tmpFile, envelope);

  return new Promise<string>((resolve, reject) => {
    const url =
      "https://api2.cursor.sh/aiserver.v1.ChatService/StreamUnifiedChatWithTools";

    // Use curl with HTTP/2
    const curlArgs = [
      "--http2",
      "-s", // Silent mode
      "-X",
      "POST",
      url,
      "-H",
      "Content-Type: application/connect+proto",
      "-H",
      "connect-accept-encoding: gzip",
      "-H",
      "connect-protocol-version: 1",
      "-H",
      `x-cursor-client-type: ide`,
      "-H",
      `x-cursor-client-version: ${X_CURSOR_CLIENT_VERSION ?? ""}`,
      "-H",
      "x-cursor-streaming: true",
      "-H",
      `x-request-id: ${X_REQUEST_ID ?? ""}`,
      "-H",
      `x-session-id: ${X_SESSION_ID ?? ""}`,
      "-H",
      `Authorization: Bearer ${token}`,
      "--data-binary",
      `@${tmpFile}`,
      "-w",
      "\n%{http_code}", // Append status code
    ];

    const curl = spawn("curl", curlArgs);

    const chunks: Buffer[] = [];
    let stderr = "";

    curl.stdout.on("data", (chunk) => {
      chunks.push(chunk);
    });

    curl.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    curl.on("close", (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // Ignore cleanup errors
      }

      const output = Buffer.concat(chunks);

      // Parse status code from end of output
      const outputStr = output.toString();
      const lines = outputStr.trimEnd().split("\n");
      const statusCode = parseInt(lines[lines.length - 1], 10) || 0;

      console.log("HTTP Status:", statusCode);

      // Remove the status code line from output
      const responseData = output.subarray(
        0,
        output.length - lines[lines.length - 1].length - 1
      );

      const result = createStreamResult(
        statusCode,
        "application/connect+proto"
      );

      if (responseData.length > 0) {
        // Check if response is gzip compressed and decompress
        let decompressedData = responseData;
        // Gzip magic bytes: 0x1f 0x8b
        if (responseData[0] === 0x1f && responseData[1] === 0x8b) {
          try {
            decompressedData = zlib.gunzipSync(responseData);
            console.log(
              "Decompressed response:",
              decompressedData.length,
              "bytes"
            );
          } catch (e) {
            console.error("Failed to decompress response:", e);
          }
        }

        // Parse all envelopes from the buffer
        const { envelopes, remaining } =
          parseConnectEnvelopes(decompressedData);

        for (const env of envelopes) {
          if (env.isTrailer) {
            result.trailer = parseTrailer(env.data);
            continue;
          }

          try {
            const decoded = Response.decode(env.data) as unknown as Record<
              string,
              unknown
            >;
            applyDecodedToResult(decoded, result);
          } catch (e) {
            const error = e as Error;
            result.error = error.message;
            console.error("Decode error:", error.message);
          }
        }

        // Handle any remaining data
        if (remaining.length > 0) {
          try {
            const decoded = Response.decode(remaining) as unknown as Record<
              string,
              unknown
            >;
            if (decoded.text) result.text += decoded.text as string;
            const doneEdit = parseBoolField(decoded, "done_edit", "doneEdit");
            if (doneEdit !== undefined) result.doneEdit = doneEdit;
            const doneStream = parseBoolField(
              decoded,
              "done_stream",
              "doneStream"
            );
            if (doneStream !== undefined) result.doneStream = doneStream;
          } catch {
            // Try parsing as text
            const text = Buffer.from(remaining).toString("utf8");
            if (text.includes("{")) {
              try {
                result.error = JSON.parse(text);
              } catch {
                result.error = text;
              }
            }
          }
        }
      }

      if (statusCode >= 400) {
        result.error = result.error || `HTTP ${statusCode}`;
      }

      console.log(
        "Resolving with JSON (length:",
        safeStringify(result).length + ")"
      );
      console.log(result.trailer.error.details[0].debug);

      resolve(safeStringify(result, statusCode));
    });

    curl.on("error", (err) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
      reject(new Error(`curl failed: ${err.message}`));
    });
  });
}

export default sendStreamUnifiedChatRequest;
