const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function parsePitch(pitch) {
  const match = /^([A-G])([#b]?)(\d)$/.exec(pitch);
  if (!match) throw new Error(`Invalid pitch: ${pitch}`);
  const [, step, accidental, octave] = match;
  const alter = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return { step, alter, octave };
}

const DURATIONS = new Map([
  [1, { type: "16th", dots: 0 }],
  [2, { type: "eighth", dots: 0 }],
  [3, { type: "eighth", dots: 1 }],
  [4, { type: "quarter", dots: 0 }],
  [6, { type: "quarter", dots: 1 }],
  [8, { type: "half", dots: 0 }],
  [12, { type: "half", dots: 1 }],
  [16, { type: "whole", dots: 0 }]
]);

function notationFor(duration) {
  const notation = DURATIONS.get(duration);
  if (!notation) {
    throw new Error(`Unsupported duration: ${duration} ticks. Supported values: ${[...DURATIONS.keys()].join(", ")}`);
  }
  return notation;
}

function durationXml(duration) {
  const { type, dots } = notationFor(duration);
  return `<duration>${duration}</duration><type>${type}</type>${"<dot/>".repeat(dots)}`;
}

function noteXml(pitch, duration, chord = false) {
  const { step, alter, octave } = parsePitch(pitch);
  return `<note>${chord ? "<chord/>" : ""}<cue/><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave></pitch>${durationXml(duration)}</note>`;
}

function eventXml(event) {
  if (event.type === "rest") {
    if (event.duration === 16) return '<note><cue/><rest measure="yes"/><duration>16</duration></note>';
    return `<note><cue/><rest/>${durationXml(event.duration)}</note>`;
  }
  if (event.type === "chord" && event.notes?.length) {
    return event.notes.map((pitch, index) => noteXml(pitch, event.duration, index > 0)).join("");
  }
  throw new Error(`Unsupported event: ${JSON.stringify(event)}`);
}

function harmonyXml(symbol) {
  const match = /^([A-G])([#b]?)(.*)$/.exec(symbol);
  if (!match) throw new Error(`Invalid chord symbol: ${symbol}`);
  const [, root, accidental, suffix] = match;
  const alter = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const kind = suffix === "maj7" ? "major-seventh" : suffix === "m7" ? "minor-seventh" : suffix === "7" ? "dominant" : suffix === "m" ? "minor" : "major";
  return `<harmony><root><root-step font-size="8">${root}</root-step>${alter ? `<root-alter font-size="8">${alter}</root-alter>` : ""}</root><kind font-size="8" text="${escapeXml(suffix || "")}">${kind}</kind></harmony>`;
}

export function toMusicXml(score) {
  if (!score.id || !Array.isArray(score.measures) || !score.measures.length) {
    throw new Error("Score needs an id and at least one measure");
  }
  const measures = score.measures.map((measure, index) => {
    const total = measure.events.reduce((sum, event) => sum + event.duration, 0);
    if (total !== 16) throw new Error(`Measure ${index + 1} has ${total} ticks instead of 16`);
    const attributes = index === 0 ? '<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : "";
    const tempo = index === 0 ? `<direction placement="above"><direction-type><words font-family="Bravura Text" font-size="9">♩ = ${score.tempo || 84}</words></direction-type><sound tempo="${score.tempo || 84}"/></direction>` : "";
    return `<measure number="${index + 1}">${attributes}${tempo}${harmonyXml(measure.chord)}${measure.events.map(eventXml).join("")}</measure>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="4.0"><work><work-title>${escapeXml(score.title || score.id)}</work-title></work><defaults><appearance><note-size type="cue">72</note-size></appearance></defaults><part-list><score-part id="P1"><part-name font-size="9">Piano</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
}
