import https from "node:https";
import type { IncomingMessage } from "node:http";
import protobuf from "protobufjs";
import type { ProtoType } from "../types/proto";
import {
  decompressConnectMessage,
  encodeConnectEnvelope,
} from "./connectEnvelope";
import { createStreamingCommandPayload } from "./streamingCommandPayload";
import type { StreamingCommandOptions, StreamingCommandResult } from "./types";
import { DYNAMIC_PORT, DYNAMIC_CSRF_TOKEN } from "../env";

interface ObjectProtoType extends ProtoType {
  toObject(
    message: protobuf.Message,
    options?: protobuf.IConversionOptions,
  ): Record<string, unknown>;
}

const DEFAULT_ENDPOINT = `https://127.0.0.1:${DYNAMIC_PORT}/exa.language_server_pb.LanguageServerService/HandleStreamingCommand`;

export default async function sendStreamingCommand(
  options: StreamingCommandOptions = {},
): Promise<string> {
  const endpoint = new URL(options.endpoint ?? DEFAULT_ENDPOINT);
  const requestRoot = await protobuf.load(
    "./protobuf/google/handleStreamingCommandRequest.proto",
  );
  const responseRoot = await protobuf.load(
    "./protobuf/google/handleStreamingCommandResponse.proto",
  );
  const Request = requestRoot.lookupType(
    "exa.language_server_pb.HandleStreamingCommandRequest",
  ) as unknown as ProtoType;
  const Response = responseRoot.lookupType(
    "exa.language_server_pb.HandleStreamingCommandResponse",
  ) as unknown as ObjectProtoType;

  const payload = createStreamingCommandPayload(options.code);
  const message = Request.encode(Request.create(payload)).finish();
  const envelope = encodeConnectEnvelope(message);

  const requestOptions: https.RequestOptions = {
    hostname: endpoint.hostname,
    port: endpoint.port || 443,
    path: endpoint.pathname,
    method: "POST",
    rejectUnauthorized: endpoint.hostname !== "127.0.0.1",
    headers: {
      "connect-accept-encoding": "gzip,br",
      "connect-protocol-version": "1",
      "content-type": "application/connect+proto",
      "user-agent": "connect-es/2.1.1",
      "x-codeium-csrf-token": options.csrfToken ?? DYNAMIC_CSRF_TOKEN,
      "content-length": envelope.length,
    },
  };

  return new Promise<string>((resolve, reject) => {
    const req = https.request(requestOptions, (res: IncomingMessage) => {
      let pending = Buffer.alloc(0);
      const result: StreamingCommandResult = {
        status: res.statusCode,
        contentType: res.headers["content-type"] ?? "",
        messages: [],
        trailer: null,
        error: null,
      };

      res.on("data", (chunk: Buffer) => {
        pending = Buffer.concat([pending, chunk]);

        while (pending.length >= 5) {
          const flags = pending.readUInt8(0);
          const messageLength = pending.readUInt32BE(1);
          if (pending.length < messageLength + 5) break;

          let messageData = pending.subarray(5, messageLength + 5);
          pending = pending.subarray(messageLength + 5);

          try {
            if (flags & 0x01) {
              const encoding = res.headers["connect-content-encoding"];
              messageData = decompressConnectMessage(
                messageData,
                Array.isArray(encoding) ? encoding[0] : encoding,
              );
            }
          } catch (error) {
            result.error = (error as Error).message;
            continue;
          }

          if (flags & 0x02) {
            try {
              result.trailer = JSON.parse(messageData.toString("utf8"));
            } catch {
              result.trailer = messageData.toString("utf8");
            }
            continue;
          }

          try {
            const decoded = Response.decode(messageData);
            result.messages.push(
              Response.toObject(decoded, {
                longs: String,
                defaults: true,
              }),
            );
          } catch (error) {
            result.error = (error as Error).message;
          }
        }
      });

      res.on("end", () => {
        if (pending.length > 0 && !result.error) {
          result.error = `Incomplete Connect frame (${pending.length} bytes)`;
        }
        if (res.statusCode && res.statusCode >= 400 && !result.error) {
          result.error = `HTTP ${res.statusCode}`;
        }
        resolve(JSON.stringify(result, null, 2));
      });

      res.on("error", (error: Error) => {
        result.error = error.message;
        resolve(JSON.stringify(result, null, 2));
      });
    });

    req.on("error", reject);
    req.end(envelope);
  });
}
