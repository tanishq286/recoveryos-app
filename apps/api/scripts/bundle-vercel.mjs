// Bundles dist/vercel.js (and every dependency) into bundle/vercel.mjs for Vercel.
import { rolldown } from "rolldown";

// Optional Nest peers loaded only when installed, plus pg's optional native binding.
const OPTIONAL = [
  /^@nestjs\/(microservices|websockets|platform-fastify|platform-socket\.io)(\/|$)/,
  /^class-(transformer|validator)(\/|$)/,
  /^@fastify\//,
  /^pg-native$/,
];

const bundle = await rolldown({
  input: new URL("../dist/vercel.js", import.meta.url).pathname,
  platform: "node",
  external: (id) => OPTIONAL.some((re) => re.test(id)),
  logLevel: "warn",
});
await bundle.write({
  file: new URL("../bundle/vercel.mjs", import.meta.url).pathname,
  format: "esm",
  // One file: dynamic imports (the Prisma WASM module) are inlined.
  codeSplitting: false,
  // CommonJS dependencies inside an ES module still expect these.
  banner: [
    'import { createRequire as __cr } from "node:module";',
    'import { fileURLToPath as __fu } from "node:url";',
    'import { dirname as __dn } from "node:path";',
    "const require = __cr(import.meta.url);",
    "const __filename = __fu(import.meta.url);",
    "const __dirname = __dn(__filename);",
  ].join("\n"),
});
await bundle.close();
console.log("Bundled bundle/vercel.mjs");
