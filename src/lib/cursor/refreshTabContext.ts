import protobuf from "protobufjs";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type {
  RefreshTabContextRequest,
  ProtoType,
  ProtoReader,
  ManuallyDecodedResponse,
  DecodedCodeResult,
} from "../types/proto";
import { defaultRefreshTabContextPayload } from "./constants";
import { CURSOR_BEARER_TOKEN, X_REQUEST_ID, X_SESSION_ID } from "../env";

async function sendRequest(): Promise<void> {
  const requestRoot = await protobuf.load(
    "./protobuf/cursor/refreshTabContextRequest.proto",
  );
  const Request = requestRoot.lookupType(
    "aiserver.v1.RefreshTabContextRequest",
  ) as unknown as ProtoType;

  const responseRoot = await protobuf.load(
    "./protobuf/cursor/refreshTabContextResponse.proto",
  );
  const Response = responseRoot.lookupType(
    "aiserver.v1.RefreshTabContextResponse",
  ) as unknown as ProtoType;

  const payload: RefreshTabContextRequest = defaultRefreshTabContextPayload;

  const buffer = Buffer.from(Request.encode(Request.create(payload)).finish());

  const options: https.RequestOptions = {
    hostname: "api2.cursor.sh",
    path: "/aiserver.v1.AiService/RefreshTabContext",
    method: "POST",
    headers: {
      "Content-Type": "application/proto",
      Authorization: `Bearer ${CURSOR_BEARER_TOKEN}`,
      "Content-Length": buffer.length,
      "x-request-id": X_REQUEST_ID ?? "",
      "x-session-id": X_SESSION_ID ?? "",
    },
  };

  const req = https.request(options, (res: IncomingMessage) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => {
      const responseBuffer = Buffer.concat(chunks);
      const contentType = res.headers["content-type"] ?? "";

      console.log("Response status:", res.statusCode);
      console.log("Content-Type:", contentType);
      console.log("Response buffer length:", responseBuffer.length);

      // Check if response is JSON (error responses are often JSON)
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/json") ||
        (responseBuffer.length > 0 && responseBuffer[0] === 0x7b) // Starts with '{'
      ) {
        try {
          const jsonResponse = JSON.parse(
            responseBuffer.toString("utf8"),
          ) as unknown;
          console.log("JSON Response:");
          console.log(JSON.stringify(jsonResponse, null, 2));
          return;
        } catch (jsonError) {
          const error = jsonError as Error;
          console.warn("Failed to parse as JSON:", error.message);
        }
      }

      // Try to decode as protobuf
      if (
        contentType.includes("application/proto") ||
        contentType.includes("application/x-protobuf") ||
        contentType.includes("application/octet-stream")
      ) {
        try {
          // Try decoding with lenient mode (skip unknown fields)
          const decoded = Response.decode(responseBuffer);
          const errMsg = Response.verify(decoded);
          if (errMsg) {
            console.warn("Verification warning:", errMsg);
          }
          console.log("Protobuf Response:");
          console.log(JSON.stringify(decoded, null, 2));
        } catch (error) {
          const protoError = error as Error & { offset?: number };
          console.error("Protobuf decode error:", protoError.message);
          console.error("Error at offset:", protoError.offset ?? "unknown");

          // Try to decode with a reader that skips unknown fields
          try {
            const reader = protobuf.Reader.create(
              responseBuffer,
            ) as ProtoReader;
            const decoded: ManuallyDecodedResponse = {};

            // Manually decode field by field, skipping unknown ones
            while (reader.pos < reader.len) {
              const tag = reader.uint32();
              const fieldNo = tag >>> 3;
              const wireType = tag & 0x7;

              if (fieldNo === 1 && wireType === 2) {
                // code_results field
                if (!decoded.codeResults) decoded.codeResults = [];
                const codeResultLen = reader.uint32();
                const codeResultEnd = reader.pos + codeResultLen;
                const codeResult: DecodedCodeResult = {};

                while (reader.pos < codeResultEnd) {
                  const crTag = reader.uint32();
                  const crFieldNo = crTag >>> 3;
                  const crWireType = crTag & 0x7;

                  if (crFieldNo === 1 && crWireType === 2) {
                    // code_block
                    const cbLen = reader.uint32();
                    const cbEnd = reader.pos + cbLen;
                    const codeBlock: DecodedCodeResult["codeBlock"] = {};

                    while (reader.pos < cbEnd) {
                      const cbTag = reader.uint32();
                      const cbFieldNo = cbTag >>> 3;
                      const cbWireType = cbTag & 0x7;

                      try {
                        if (cbFieldNo === 1 && cbWireType === 2) {
                          codeBlock.relativeWorkspacePath = reader.string();
                        } else if (cbFieldNo === 2 && cbWireType === 2) {
                          // range - decode it properly
                          const rangeLen = reader.uint32();
                          const rangeEnd = reader.pos + rangeLen;
                          const range: NonNullable<
                            DecodedCodeResult["codeBlock"]
                          >["range"] = {};
                          while (reader.pos < rangeEnd) {
                            const rTag = reader.uint32();
                            const rFieldNo = rTag >>> 3;
                            const rWireType = rTag & 0x7;
                            if (rFieldNo === 1 && rWireType === 2) {
                              // start_position
                              const posLen = reader.uint32();
                              const posEnd = reader.pos + posLen;
                              const pos: { line?: number; column?: number } =
                                {};
                              while (reader.pos < posEnd) {
                                const pTag = reader.uint32();
                                const pFieldNo = pTag >>> 3;
                                const pWireType = pTag & 0x7;
                                if (pFieldNo === 1 && pWireType === 0)
                                  pos.line = reader.int32();
                                else if (pFieldNo === 2 && pWireType === 0)
                                  pos.column = reader.int32();
                                else reader.skipType(pWireType);
                              }
                              range.startPosition = pos;
                            } else if (rFieldNo === 2 && rWireType === 2) {
                              // end_position
                              const posLen = reader.uint32();
                              const posEnd = reader.pos + posLen;
                              const pos: { line?: number; column?: number } =
                                {};
                              while (reader.pos < posEnd) {
                                const pTag = reader.uint32();
                                const pFieldNo = pTag >>> 3;
                                const pWireType = pTag & 0x7;
                                if (pFieldNo === 1 && pWireType === 0)
                                  pos.line = reader.int32();
                                else if (pFieldNo === 2 && pWireType === 0)
                                  pos.column = reader.int32();
                                else reader.skipType(pWireType);
                              }
                              range.endPosition = pos;
                            } else {
                              reader.skipType(rWireType);
                            }
                          }
                          codeBlock.range = range;
                        } else if (cbFieldNo === 3 && cbWireType === 2) {
                          codeBlock.contents = reader.string();
                        } else if (cbFieldNo === 4 && cbWireType === 2) {
                          // signatures - decode it properly
                          const sigLen = reader.uint32();
                          const sigEnd = reader.pos + sigLen;
                          const signatures: { ranges: object[] } = {
                            ranges: [],
                          };
                          while (reader.pos < sigEnd) {
                            const sigTag = reader.uint32();
                            const sigFieldNo = sigTag >>> 3;
                            const sigWireType = sigTag & 0x7;
                            if (sigFieldNo === 1 && sigWireType === 2) {
                              // ranges (repeated SignatureRange)
                              const srLen = reader.uint32();
                              const srEnd = reader.pos + srLen;
                              const sr = {};
                              // Decode any fields in SignatureRange
                              while (reader.pos < srEnd) {
                                const srTag = reader.uint32();
                                const srWireType = srTag & 0x7;
                                // Skip unknown fields
                                if (srWireType === 0) reader.uint32();
                                else if (srWireType === 1) reader.skip(8);
                                else if (srWireType === 2) {
                                  const len = reader.uint32();
                                  reader.skip(len);
                                } else if (srWireType === 5) reader.skip(4);
                              }
                              signatures.ranges.push(sr);
                            } else {
                              // Skip unknown fields
                              if (sigWireType === 0) reader.uint32();
                              else if (sigWireType === 1) reader.skip(8);
                              else if (sigWireType === 2) {
                                const len = reader.uint32();
                                reader.skip(len);
                              } else if (sigWireType === 5) reader.skip(4);
                            }
                          }
                          codeBlock.signatures = signatures;
                        } else if (cbFieldNo === 5 && cbWireType === 2) {
                          // detailed_lines (repeated) - handle each item
                          if (!codeBlock.detailedLines)
                            codeBlock.detailedLines = [];
                          const dlItemLen = reader.uint32();
                          const dlItemEnd = reader.pos + dlItemLen;
                          const dlItem = {};
                          // Decode any fields in DetailedLine
                          while (reader.pos < dlItemEnd) {
                            const dlTag = reader.uint32();
                            const dlWireType = dlTag & 0x7;
                            // Skip unknown fields (DetailedLine might have fields we don't know about)
                            if (dlWireType === 0) reader.uint32();
                            else if (dlWireType === 1) reader.skip(8);
                            else if (dlWireType === 2) {
                              const len = reader.uint32();
                              reader.skip(len);
                            } else if (dlWireType === 5) reader.skip(4);
                            else {
                              // Invalid wire type - this might be the issue
                              throw new Error(
                                `Invalid wire type ${dlWireType} in DetailedLine at pos ${reader.pos}`,
                              );
                            }
                          }
                          codeBlock.detailedLines.push(dlItem);
                        } else {
                          // Unknown field - skip it properly
                          if (cbWireType === 0) reader.uint32();
                          else if (cbWireType === 1) reader.skip(8);
                          else if (cbWireType === 2) {
                            const len = reader.uint32();
                            reader.skip(len);
                          } else if (cbWireType === 5) reader.skip(4);
                          else {
                            throw new Error(`Unknown wire type: ${cbWireType}`);
                          }
                        }
                      } catch (skipErr) {
                        const innerError = skipErr as Error;
                        console.error(
                          `Error at cbFieldNo ${cbFieldNo}, wireType ${cbWireType}, pos ${reader.pos}:`,
                          innerError.message,
                        );
                        // Try to recover by skipping to next field
                        break;
                      }
                    }
                    codeResult.codeBlock = codeBlock;
                  } else if (crFieldNo === 2 && crWireType === 1) {
                    // score (double)
                    codeResult.score = reader.double();
                  } else {
                    // Unknown field - skip it
                    reader.skipType(crWireType);
                  }
                }
                decoded.codeResults.push(codeResult);
              } else {
                // Unknown field - skip it
                reader.skipType(wireType);
              }
            }

            console.log("Partially decoded (skipping unknown fields):");
            console.log(JSON.stringify(decoded, null, 2));
          } catch (manualError) {
            const manualErr = manualError as Error;
            console.error("Manual decode also failed:", manualErr.message);

            // Show first bytes for debugging
            if (responseBuffer.length > 0) {
              const preview = responseBuffer.slice(
                0,
                Math.min(200, responseBuffer.length),
              );
              console.log("Response preview (hex):", preview.toString("hex"));
              console.log(
                "Response preview (text):",
                preview.toString("utf8").replace(/[^\x20-\x7E\n\r]/g, "."),
              );
            }
          }
        }
      } else {
        console.warn("Unknown Content-Type, attempting to detect format...");
        // Try JSON first (most common for errors)
        try {
          const jsonResponse = JSON.parse(
            responseBuffer.toString("utf8"),
          ) as unknown;
          console.log("Detected JSON Response:");
          console.log(JSON.stringify(jsonResponse, null, 2));
        } catch {
          // Then try protobuf
          try {
            const decoded = Response.decode(responseBuffer);
            console.log("Detected Protobuf Response:");
            console.log(JSON.stringify(decoded, null, 2));
          } catch {
            console.error("Could not decode as JSON or Protobuf");
            console.error("Raw response:", responseBuffer.toString("utf8"));
          }
        }
      }
    });
  });

  req.write(buffer);
  req.end();
}

export default sendRequest;
