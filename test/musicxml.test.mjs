import test from "node:test";
import assert from "node:assert/strict";
import { toMusicXml } from "../scripts/musicxml.mjs";

test("creates four valid-sized measures and chord symbols", () => {
  const xml = toMusicXml({
    id: "test",
    measures: [
      { chord: "Cmaj7", events: [{ type: "rest", duration: 16 }] },
      { chord: "B", events: [{ type: "rest", duration: 16 }] },
      { chord: "Em7", events: [{ type: "rest", duration: 16 }] },
      { chord: "Bm7", events: [{ type: "rest", duration: 16 }] }
    ]
  });
  assert.equal((xml.match(/<measure number=/g) || []).length, 4);
  assert.match(xml, /major-seventh/);
  assert.match(xml, /minor-seventh/);
  assert.match(xml, /♩ = 84/);
});

test("rejects an incomplete measure", () => {
  assert.throws(() => toMusicXml({
    id: "bad",
    measures: [{ chord: "C", events: [{ type: "rest", duration: 2 }] }]
  }), /instead of 16/);
});

test("writes dotted durations explicitly", () => {
  const xml = toMusicXml({
    id: "dotted",
    measures: [{
      chord: "C",
      events: [
        { type: "rest", duration: 6 },
        { type: "chord", notes: ["C4"], duration: 2 },
        { type: "rest", duration: 8 }
      ]
    }]
  });
  assert.match(xml, /<rest\/><duration>6<\/duration><type>quarter<\/type><dot\/>/);
});

test("rejects a duration without a defined notation", () => {
  assert.throws(() => toMusicXml({
    id: "ambiguous",
    measures: [{ chord: "C", events: [{ type: "rest", duration: 5 }, { type: "rest", duration: 11 }] }]
  }), /Unsupported duration: 5 ticks/);
});
