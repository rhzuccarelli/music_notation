import test from "node:test";
import assert from "node:assert/strict";
import { readFile, glob } from "node:fs/promises";

test("assigns every musical score to a songbook or the explicit exclusion list", async () => {
  const config = JSON.parse(await readFile(new URL("../site/songbooks.json", import.meta.url), "utf8"));
  const assigned = [];
  for await (const file of glob("examples/*.json")) {
    const score = JSON.parse(await readFile(file, "utf8"));
    const songs = config.songs.filter((song) => score.id.startsWith(song.idPrefix));
    assert.ok(songs.length === 1 || config.excludedScoreIds.includes(score.id), `${score.id} needs exactly one songbook or an exclusion`);
    assigned.push(...songs.map((song) => `${song.id}:${score.id}`));
  }
  assert.equal(assigned.filter((item) => item.startsWith("cage:")).length, 7);
  assert.equal(assigned.filter((item) => item.startsWith("sabah:")).length, 9);
});
