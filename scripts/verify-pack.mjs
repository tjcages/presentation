import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const output = execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  { encoding: "utf8" },
);

const [packed] = JSON.parse(output);
assert.ok(packed, "npm pack did not describe a package");

const paths = packed.files.map((file) => file.path).sort();
const allowedRootFiles = new Set(["LICENSE", "README.md", "package.json"]);

for (const path of paths) {
  assert.ok(
    path.startsWith("dist/") || allowedRootFiles.has(path),
    `Unexpected file in package: ${path}`,
  );
  assert.ok(
    !path.startsWith("dist/demo/"),
    `Demo leaked into package: ${path}`,
  );
  assert.ok(
    !path.startsWith("dist/src/"),
    `Nested source output leaked into package: ${path}`,
  );
}

for (const required of [
  "LICENSE",
  "README.md",
  "package.json",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/presentation.css",
  "dist/presentation.css.d.ts",
]) {
  assert.ok(paths.includes(required), `Package is missing ${required}`);
}

console.log(
  `Verified ${paths.length} published files (${packed.unpackedSize} bytes).`,
);
