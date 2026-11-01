/**
 * Vercel serverless entry. The Nest app is built once per instance and reused
 * across requests (Fluid compute keeps instances warm); every path is
 * rewritten here by vercel.json, and Nest routes on the original URL.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Express } from "express";

import { createApp } from "./bootstrap.js";

let ready: Promise<Express> | null = null;

function instance() {
  ready ??= createApp()
    .then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance() as Express;
    })
    .catch((e) => {
      // Let the next request try again instead of caching the failure.
      ready = null;
      throw e;
    });
  return ready;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  let app: Express;
  try {
    app = await instance();
  } catch (e) {
    console.error("API failed to start:", e);
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({ message: "Finsol Enterprises is starting up. Please try again shortly." }),
    );
    return;
  }
  app(req as Parameters<Express>[0], res as Parameters<Express>[1]);
}
