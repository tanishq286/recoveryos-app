// Vercel function entry. The real handler is src/vercel.ts, bundled into one
// ESM file by scripts/bundle-vercel.mjs during the build: Vercel's loader
// cannot require() an ES module, which @nestjs/throttler (CommonJS) does with
// @nestjs/common (ESM-only since Nest 12).
export { default } from "../bundle/vercel.mjs";
