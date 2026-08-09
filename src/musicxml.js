import { escapeXml, measureDuration } from './library.js';

const fifths = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
const articulationNames = { staccato: 'staccato', accent: 'accent', tenuto: 'tenuto', marcato: 'strong-accent' };

function parsePitch(value) {
  const [, step, accidental = '', octave] = value.match(/^([A-G])([#b]?)([0-9])$/);
  return { step, alter: accidental === '#' ? 1 : accidental === 'b' ? -1 : 0, octave };
}

function parseHarmony(symbol) {
  const match = symbol.match(/^([A-G])([#b]?)(.*)$/);
  const kinds = { '': ['major', ''], maj7: ['major-seventh', 'maj7'], m: ['minor', 'm'], m7: ['minor-seventh', 'm7'], 7: ['dominant', '7'], dim: ['diminished', 'dim'], aug: ['augmented', 'aug'] };
  const [, step, accidental, suffix] = match;
  const [kind, text] = kinds[suffix];
  const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return `<harmony><root><root-step>${step}</root-step>${alter ? `<root-alter>${alter}</root-alter>` : ''}</root><kind${text ? ` text="${text}"` : ''}>${kind}</kind></harmony>`;
}

function durationPieces(duration, divisions) {
  const candidates = [
    [divisions * 4, 'whole'], [divisions * 2, 'half'], [divisions, 'quarter'],
    [divisions / 2, 'eighth'], [divisions / 4, '16th'], [divisions / 8, '32nd']
  ].filter(([units]) => Number.isInteger(units) && units > 0);
  const pieces = [];
  let remaining = duration;
  for (const [units, type] of candidates) {
    while (remaining >= units) { pieces.push({ duration: units, type }); remaining -= units; }
  }
  if (remaining) throw new Error(`Duration ${duration} cannot be expressed with divisions=${divisions}`);
  return pieces;
}

function restXml(duration, divisions) {
  return durationPieces(duration, divisions).map((piece) => `<note><rest/><duration>${piece.duration}</duration><voice>1</voice><type>${piece.type}</type></note>`).join('');
}

function eventXml(event, divisions) {
  const pieces = durationPieces(event.duration, divisions);
  if (pieces.length !== 1) throw new Error(`Pitched duration ${event.duration} must map to one standard note value in v0.1`);
  const { type } = pieces[0];
  return event.notes.map((value, index) => {
    const pitch = parsePitch(value);
    const tieTypes = event.tie === 'continue' ? ['stop', 'start'] : event.tie ? [event.tie] : [];
    const articulations = event.articulations?.map((name) => `<${articulationNames[name]}/>`).join('') ?? '';
    const notations = tieTypes.length || articulations ? `<notations>${tieTypes.map((type) => `<tied type="${type}"/>`).join('')}${articulations ? `<articulations>${articulations}</articulations>` : ''}</notations>` : '';
    return `<note>${index ? '<chord/>' : ''}<pitch><step>${pitch.step}</step>${pitch.alter ? `<alter>${pitch.alter}</alter>` : ''}<octave>${pitch.octave}</octave></pitch><duration>${event.duration}</duration>${tieTypes.map((tie) => `<tie type="${tie}"/>`).join('')}<voice>1</voice><type>${type}</type>${notations}</note>`;
  }).join('');
}

function directionXml(event) {
  return event.dynamic ? `<direction placement="below"><direction-type><dynamics><${event.dynamic}/></dynamics></direction-type><sound dynamics="64"/></direction>` : '';
}

export function toMusicXml(idea) {
  const { score } = idea;
  const measureLength = measureDuration(score);
  const partList = score.parts.map((part, index) => `<score-part id="P${index + 1}"><part-name>${escapeXml(part.name)}</part-name></score-part>`).join('');
  const parts = score.parts.map((part, partIndex) => {
    const measures = part.measures.map((measure, measureIndex) => {
      const attributes = measureIndex === 0 ? `<attributes><divisions>${score.divisions}</divisions><key><fifths>${fifths[score.key.replace(/m$/, '')]}</fifths><mode>${score.key.endsWith('m') ? 'minor' : 'major'}</mode></key><time><beats>${score.meter.beats}</beats><beat-type>${score.meter.beatType}</beat-type></time><clef><sign>${part.clef === 'bass' ? 'F' : 'G'}</sign><line>${part.clef === 'bass' ? 4 : 2}</line></clef></attributes>` : '';
      const tempo = partIndex === 0 && measureIndex === 0 ? `<direction placement="above"><direction-type><words>${score.tempo} BPM</words></direction-type><sound tempo="${score.tempo}"/></direction>` : '';
      const harmonies = measure.harmony.map((harmony) => harmony.offset === 0 ? parseHarmony(harmony.symbol) : `<forward><duration>${harmony.offset}</duration></forward>${parseHarmony(harmony.symbol)}<backup><duration>${harmony.offset}</duration></backup>`).join('');
      let cursor = 0;
      let notes = '';
      for (const event of [...measure.events].sort((a, b) => a.offset - b.offset)) {
        if (event.offset > cursor) notes += restXml(event.offset - cursor, score.divisions);
        notes += directionXml(event) + eventXml(event, score.divisions);
        cursor = event.offset + event.duration;
      }
      if (cursor < measureLength) notes += restXml(measureLength - cursor, score.divisions);
      return `<measure number="${measure.number}">${attributes}${tempo}${harmonies}${notes}</measure>`;
    }).join('');
    return `<part id="P${partIndex + 1}">${measures}</part>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="4.0"><work><work-title>${escapeXml(idea.title)}</work-title></work><identification><encoding><software>Music Notation Sketchbook 0.1</software></encoding></identification><part-list>${partList}</part-list>${parts}</score-partwise>\n`;
}
