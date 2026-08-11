import test from "node:test";
import assert from "node:assert/strict";
import { readFile, glob } from "node:fs/promises";

test("assigns every musical score to exactly one songbook or the explicit exclusion list", async () => {
  const config = JSON.parse(await readFile(new URL("../site/songbooks.json", import.meta.url), "utf8"));
  const assignments = new Map(config.songs.map((song) => [song.id, []]));

  for await (const file of glob("examples/*.json")) {
    const score = JSON.parse(await readFile(file, "utf8"));
    const songs = config.songs.filter((song) => score.id.startsWith(song.idPrefix));
    const excluded = config.excludedScoreIds.includes(score.id);

    assert.ok(
      songs.length === 1 || excluded,
      `${score.id} needs exactly one songbook or an exclusion`
    );
    assert.ok(
      !(songs.length === 1 && excluded),
      `${score.id} cannot be both assigned to a songbook and explicitly excluded`
    );

    if (songs.length === 1) assignments.get(songs[0].id).push(score.id);
  }

  for (const song of config.songs) {
    assert.ok(
      assignments.get(song.id).length > 0,
      `${song.id} songbook must contain at least one score`
    );
  }
});
