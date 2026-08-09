import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateScore } from "../scripts/validate.mjs";
import { ensembleToMusicXml } from "../scripts/ensemble-musicxml.mjs";

const demo = JSON.parse(await readFile(new URL("../examples/instrument-layouts-demo.json", import.meta.url), "utf8"));

test("validates the multi-instrument format", () => assert.doesNotThrow(() => validateScore(demo)));

test("writes piano grand staff, transpositions, and TAB", () => {
  const xml = ensembleToMusicXml(demo);
  assert.match(xml, /<staves>2<\/staves>/);
  assert.match(xml, /<sign>F<\/sign><line>4<\/line>/);
  assert.match(xml, /<chromatic>-2<\/chromatic>/);
  assert.match(xml, /<chromatic>-9<\/chromatic>/);
  assert.match(xml, /<sign>TAB<\/sign>/);
  assert.match(xml, /<string>5<\/string><fret>3<\/fret>/);
});
