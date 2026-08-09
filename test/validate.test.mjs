import test from "node:test";
import assert from "node:assert/strict";
import { validateScore } from "../scripts/validate.mjs";

const valid = {
  id: "valid-score",
  title: "Valid score",
  tempo: 84,
  timeSignature: "4/4",
  measures: [{ chord: "Cmaj7", events: [{ type: "rest", duration: 16 }] }]
};

test("accepts a schema-valid complete measure", () => {
  assert.doesNotThrow(() => validateScore(structuredClone(valid)));
});

test("rejects invalid pitches", () => {
  const score = structuredClone(valid);
  score.measures[0].events = [{ type: "chord", notes: ["H4"], duration: 16 }];
  assert.throws(() => validateScore(score), /must match pattern/);
});

test("rejects a measure with the wrong total duration", () => {
  const score = structuredClone(valid);
  score.measures[0].events = [{ type: "rest", duration: 8 }];
  assert.throws(() => validateScore(score), /expected 16 ticks/);
});
