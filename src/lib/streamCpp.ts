import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import type { StreamCppRequest, ProtoType } from "./types/proto";
import { defaultStreamCppPayload } from "./constants";
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
  tryParseJsonError,
  safeStringify,
  parseBoolField,
} from "./utils/protoUtils";

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

async function sendStreamCppRequest(
  code: string = "function"
): Promise<string> {
  const token = CURSOR_BEARER_TOKEN;
  if (!token || token === "undefined") {
    console.error(
      "Missing CURSOR_BEARER_TOKEN. dotenv loaded 0 vars; set it in your shell or .env."
    );
    process.exit(1);
  }

  const newPayload = { ...defaultStreamCppPayload };
  newPayload.currentFile.contents = code;

  console.log("New Code:", code);

  const { Request, Response } = await loadProtoTypes(
    path.join(projectRoot, "protobuf/streamCppRequest.proto"),
    "aiserver.v1.StreamCppRequest",
    path.join(projectRoot, "protobuf/streamCppResponse.proto"),
    "aiserver.v1.StreamCppResponse"
  );

  const payload: StreamCppRequest = newPayload;
  const RequestType = Request as unknown as ProtoType;
  const protoBuffer = Buffer.from(
    RequestType.encode(RequestType.create(payload)).finish()
  );
  const envelope = createConnectEnvelope(protoBuffer);

  const url = new URL(
    "https://us-only.gcpp.cursor.sh:443/aiserver.v1.AiService/StreamCpp"
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
      const result = createStreamResult(
        res.statusCode,
        res.headers["content-type"] ?? ""
      );

      res.on("data", (chunk: Buffer) => {
        dataBuffer = Buffer.concat([dataBuffer, chunk]);

        const { envelopes, remaining } = parseConnectEnvelopes(dataBuffer);
        dataBuffer = remaining as unknown as Buffer<ArrayBuffer>;

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
      });

      res.on("end", () => {
        // Handle any remaining data
        if (dataBuffer.length > 0) {
          const jsonError = tryParseJsonError(
            dataBuffer,
            res.headers["content-type"] ?? ""
          );
          if (jsonError) {
            result.error = jsonError;
          } else {
            // Try to parse remaining buffer as protobuf
            try {
              const decoded = Response.decode(dataBuffer) as unknown as Record<
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
              // Ignore decode errors for remaining buffer
            }
          }
        }

        if (res.statusCode && res.statusCode >= 400) {
          result.error = result.error || `HTTP ${res.statusCode}`;
        }

        console.log(
          "Resolving with JSON (length:",
          safeStringify(result).length + ")"
        );
        console.log(result);
        resolve(safeStringify(result, res.statusCode));
      });

      res.on("error", (err: Error) => {
        result.error = err.message;
        console.log(
          "Resolving with error JSON (length:",
          safeStringify(result).length + ")"
        );
        resolve(safeStringify(result));
      });
    });

    req.on("error", (err: Error) => {
      console.error("Request error:", err.message);
      reject(new Error(JSON.stringify({ error: err.message }, null, 2)));
    });

    req.write(envelope);
    req.end();
  });
}

export default sendStreamCppRequest;
