import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The finished news image lives in the repo as entry.png. This program
// delivers an exact copy of it to the directory the grader reads from,
// then proves the copy obeys the competition's size limits.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const sourcePath = join(repoRoot, "entry.png");
const targetPath = join(outputDir, "entry.png");

// Competition limits for the delivered image.
const MAX_SIDE = 1024;
const MAX_BYTES = 1024 * 1024;

function fail(message: string): never {
  console.error(`entry.png rejected: ${message}`);
  process.exit(1);
}

function readPngSize(bytes: Buffer): { width: number; height: number } {
  // A PNG starts with an 8-byte signature, then the IHDR chunk: 4 bytes of
  // chunk length, the 4-byte "IHDR" tag, and width/height as big-endian
  // 32-bit values at offsets 16 and 20.
  if (bytes.length < 24 || bytes.subarray(1, 4).toString("ascii") !== "PNG") {
    fail("not a PNG file");
  }
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    fail("first chunk is not IHDR");
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, targetPath);

const delivered = readFileSync(targetPath);
const { width, height } = readPngSize(delivered);
if (width > MAX_SIDE || height > MAX_SIDE) {
  fail(`dimensions ${width}x${height} exceed the ${MAX_SIDE}x${MAX_SIDE} limit`);
}
if (statSync(targetPath).size > MAX_BYTES) {
  fail(`file size exceeds the 1 MiB limit`);
}

console.log(`entry.png delivered: ${width}x${height}, ${delivered.length} bytes`);
