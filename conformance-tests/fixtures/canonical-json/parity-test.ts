/**
 * Canonical JSON parity test — TypeScript
 *
 * Loads the shared vector pack and verifies that the TS SDK's canonicalJson()
 * produces identical output for every test vector.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../../reference-implementation/typescript/src/crypto.js";

interface Vector {
  id: string;
  description: string;
  input: unknown;
  expected: string;
}

interface VectorPack {
  vectors: Vector[];
}

const pack: VectorPack = JSON.parse(
  readFileSync(join(__dirname, "vectors.json"), "utf-8"),
);

let passed = 0;
let failed = 0;

for (const v of pack.vectors) {
  const actual = canonicalJson(v.input);
  if (actual === v.expected) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL [${v.id}]: ${v.description}`);
    console.error(`  expected: ${v.expected}`);
    console.error(`  actual:   ${actual}`);
  }
}

console.log(`\nCanonical JSON parity (TypeScript): ${passed}/${pack.vectors.length} passed`);
if (failed > 0) {
  process.exit(1);
}
