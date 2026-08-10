import test from "node:test";
import assert from "node:assert/strict";
import { RHYTHM_PATTERNS, chooseDifferentIndex, scoreTappedRhythm } from "../site/quiz-model.mjs";

test("chooses a different quiz item when random repeats the previous one", () => {
  assert.equal(chooseDifferentIndex(4, 0, () => 0), 1);
});

test("scores an exact tapped rhythm at 100 percent", () => {
  assert.equal(scoreTappedRhythm([0, 4, 8, 12], [0, 4, 8, 12]), 100);
});

test("penalizes both missed and additional taps", () => {
  assert.equal(scoreTappedRhythm([0, 4, 8, 12], [0, 4, 6]), 57);
});

test("keeps beginner quiz rhythms ordered and inside one bar", () => {
  for (const pattern of RHYTHM_PATTERNS) {
    assert.deepEqual(pattern, [...pattern].sort((a, b) => a - b));
    assert.ok(pattern.every((slot) => slot >= 0 && slot < 16));
  }
});
