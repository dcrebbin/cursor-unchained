// src/routes/api/[...slugs]/+server.ts
import sendStreamCppRequest from "$lib/streamCpp";
import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" })
  .get("/test", () => {
    const time = Date.now();
    return new Response(`hi ${time}`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  })
  .post("/streamCpp", async ({ body }) => {
    try {
      const code = (body as { code: string }).code;
      console.log("Code:", code);
      const streamCpp = await sendStreamCppRequest(code);
      return new Response(streamCpp, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in /streamCpp:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  })
  .get("/streamCpp", async () => {
    try {
      const streamCpp = await sendStreamCppRequest();
      return new Response(streamCpp, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in GET /streamCpp:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  })
  .post("/", ({ body }) => body, {
    body: t.Object({
      name: t.String(),
    }),
  });

type RequestHandler = (v: { request: Request }) => Response | Promise<Response>;

export const fallback: RequestHandler = ({ request }) => app.handle(request);
