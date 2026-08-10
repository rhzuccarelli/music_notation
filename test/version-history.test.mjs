import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("keeps a newest-first public version history", async () => {
  const versions = JSON.parse(await readFile(new URL("../site/versions.json", import.meta.url), "utf8"));
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(versions[0].version, "0.6.2");
  assert.equal(versions[0].version, packageJson.version);
  assert.ok(versions.every((version) => /^\d+\.\d+\.\d+$/.test(version.version)));
  assert.deepEqual(versions.map((version) => version.date), [...versions.map((version) => version.date)].sort().reverse());
});
