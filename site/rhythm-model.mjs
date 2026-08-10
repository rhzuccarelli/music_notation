const DIVISIONS = 4;
const DURATIONS = [
  { value: 16, type: "whole", dots: 0 },
  { value: 12, type: "half", dots: 1 },
  { value: 8, type: "half", dots: 0 },
  { value: 6, type: "quarter", dots: 1 },
  { value: 4, type: "quarter", dots: 0 },
  { value: 3, type: "eighth", dots: 1 },
  { value: 2, type: "eighth", dots: 0 },
  { value: 1, type: "16th", dots: 0 }
];

function splitDuration(value) {
  const chunks = [];
  let remaining = value;
  while (remaining > 0) {
    const duration = DURATIONS.find((candidate) => candidate.value <= remaining);
    if (!duration) throw new Error(`Unsupported rhythmic duration: ${remaining}`);
    chunks.push(duration);
    remaining -= duration.value;
  }
  return chunks;
}

function tieMarkup(hasPrevious, hasNext) {
  const ties = `${hasPrevious ? '<tie type="stop"/>' : ""}${hasNext ? '<tie type="start"/>' : ""}`;
  const tied = `${hasPrevious ? '<tied type="stop"/>' : ""}${hasNext ? '<tied type="start"/>' : ""}`;
  return { ties, notations: tied ? `<notations>${tied}</notations>` : "" };
}

function writeChunk(chunk, rest, hasPrevious, hasNext) {
  const dots = "<dot/>".repeat(chunk.dots);
  if (rest) return `<note><rest/><duration>${chunk.value}</duration><voice>1</voice><type>${chunk.type}</type>${dots}</note>`;
  const { ties, notations } = tieMarkup(hasPrevious, hasNext);
  return `<note><pitch><step>C</step><octave>5</octave></pitch><duration>${chunk.value}</duration>${ties}<voice>1</voice><type>${chunk.type}</type>${dots}<stem>up</stem><notehead>x</notehead>${notations}</note>`;
}

function makeSegments(attacks, totalSlots, unitDuration) {
  const normalized = [...new Set(attacks)].filter((slot) => slot >= 0 && slot < totalSlots).sort((a, b) => a - b);
  const segments = [];
  if (normalized[0] > 0) segments.push({ start: 0, end: normalized[0] * unitDuration, rest: true });
  normalized.forEach((slot, index) => {
    const nextSlot = normalized[index + 1] ?? totalSlots;
    segments.push({ start: slot * unitDuration, end: nextSlot * unitDuration, rest: false });
  });
  return segments;
}

export function buildRhythmMusicXml({ attacks, totalSlots, subdivisions, tempo }) {
  const unitDuration = DIVISIONS / subdivisions;
  const measureDuration = DIVISIONS * 4;
  const totalDuration = totalSlots * unitDuration;
  const segments = makeSegments(attacks, totalSlots, unitDuration);
  const measures = [];

  for (let measureStart = 0; measureStart < totalDuration; measureStart += measureDuration) {
    const measureEnd = measureStart + measureDuration;
    const notes = [];
    for (const segment of segments) {
      const overlapStart = Math.max(segment.start, measureStart);
      const overlapEnd = Math.min(segment.end, measureEnd);
      if (overlapStart >= overlapEnd) continue;
      let cursor = overlapStart;
      for (const chunk of splitDuration(overlapEnd - overlapStart)) {
        const chunkEnd = cursor + chunk.value;
        notes.push(writeChunk(chunk, segment.rest, cursor > segment.start, chunkEnd < segment.end));
        cursor = chunkEnd;
      }
    }
    const attributes = measures.length === 0
      ? `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>`
      : "";
    measures.push(`<measure number="${measures.length + 1}">${attributes}${notes.join("")}</measure>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="4.0"><work><work-title>Captured rhythm</work-title></work><part-list><score-part id="P1"><part-name>Rhythm</part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
}
