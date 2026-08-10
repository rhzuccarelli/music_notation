import test from "node:test";
import assert from "node:assert/strict";
import { INTERVAL_LEVELS, INTERVAL_SOUNDS, RHYTHM_PATTERNS, RHYTHM_SOUNDS, chooseDifferentIndex, scoreTappedRhythm } from "../site/quiz-model.mjs";

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

test("includes every chromatic interval from unison through octave", () => {
  assert.deepEqual(INTERVAL_LEVELS.all.map((interval) => interval.semitones), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("offers three distinct rhythm sounds from short to sustained", () => {
  assert.deepEqual(RHYTHM_SOUNDS.map((sound) => sound.id), ["click", "wood", "sustain"]);
  assert.equal(new Set(RHYTHM_SOUNDS.map((sound) => sound.symbol)).size, 3);
  assert.ok(RHYTHM_SOUNDS[0].duration < RHYTHM_SOUNDS[1].duration);
  assert.ok(RHYTHM_SOUNDS[1].duration < RHYTHM_SOUNDS[2].duration);
});

test("offers three distinct pitched interval timbres", () => {
  assert.deepEqual(INTERVAL_SOUNDS.map((sound) => sound.oscillator), ["sine", "triangle", "square"]);
  assert.equal(new Set(INTERVAL_SOUNDS.map((sound) => sound.symbol)).size, 3);
});
