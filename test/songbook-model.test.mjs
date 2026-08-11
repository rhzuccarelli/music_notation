import test from "node:test";
import assert from "node:assert/strict";
import { moveSketch, normalizeSongbookState, removeSketch } from "../site/songbook-model.mjs";

test("moves sketches without losing them", () => {
  assert.deepEqual(moveSketch(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveSketch(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
});

test("removes a sketch reversibly from a songbook state", () => {
  assert.deepEqual(removeSketch({ order: ["a", "b"], removed: [] }, "a"), { order: ["b"], removed: ["a"] });
  assert.deepEqual(normalizeSongbookState(["a", "b"]), { order: ["a", "b"], removed: [] });
});

test("keeps newly added sketches when restoring a saved order", () => {
  assert.deepEqual(normalizeSongbookState(["a", "b", "c"], { order: ["b"], removed: ["a"] }), { order: ["b", "c"], removed: ["a"] });
});
