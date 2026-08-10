import test from "node:test";
import assert from "node:assert/strict";
import { buildRhythmMusicXml } from "../site/rhythm-model.mjs";

test("writes quarter notes for taps spaced one beat apart", () => {
  const xml = buildRhythmMusicXml({ attacks: [0, 2, 4, 6], totalSlots: 8, subdivisions: 2, tempo: 100 });
  assert.equal((xml.match(/<type>quarter<\/type>/g) ?? []).length, 4);
  assert.equal((xml.match(/<rest\/>/g) ?? []).length, 0);
});

test("consolidates the opening silence into one conventional rest", () => {
  const xml = buildRhythmMusicXml({ attacks: [4], totalSlots: 8, subdivisions: 2, tempo: 100 });
  assert.equal((xml.match(/<rest\/>/g) ?? []).length, 1);
  assert.match(xml, /<rest\/><duration>8<\/duration><voice>1<\/voice><type>half<\/type>/);
});

test("ties an inferred note across a barline", () => {
  const xml = buildRhythmMusicXml({ attacks: [6], totalSlots: 16, subdivisions: 2, tempo: 100 });
  assert.match(xml, /<tie type="start"\/>/);
  assert.match(xml, /<tie type="stop"\/>/);
  assert.equal((xml.match(/<measure number=/g) ?? []).length, 2);
});

test("splits and ties an off-beat note across the next beat", () => {
  const xml = buildRhythmMusicXml({ attacks: [7, 10], totalSlots: 16, subdivisions: 4, tempo: 100 });
  assert.match(xml, /<duration>1<\/duration><tie type="start"\/>/);
  assert.match(xml, /<duration>2<\/duration><tie type="stop"\/>/);
});

test("beams short notes together within a beat", () => {
  const xml = buildRhythmMusicXml({ attacks: [0, 3, 4], totalSlots: 16, subdivisions: 4, tempo: 100 });
  assert.match(xml, /<beam number="1">begin<\/beam>/);
  assert.match(xml, /<beam number="1">end<\/beam>/);
  assert.match(xml, /<beam number="2">backward hook<\/beam>/);
});
