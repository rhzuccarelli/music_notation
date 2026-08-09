import { INSTRUMENTS } from "./instruments.mjs";

const STEPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const DUR = new Map([[1,["16th",0]],[2,["eighth",0]],[3,["eighth",1]],[4,["quarter",0]],[6,["quarter",1]],[8,["half",0]],[12,["half",1]],[16,["whole",0]]]);

function midi(pitch) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(pitch);
  if (!m) throw new Error(`Invalid pitch: ${pitch}`);
  const natural = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]];
  return (Number(m[3]) + 1) * 12 + natural + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

function pitchFromMidi(value) {
  const name = STEPS[((value % 12) + 12) % 12];
  return { step:name[0], alter:name.length > 1 ? 1 : 0, octave:Math.floor(value / 12) - 1 };
}

function durationXml(ticks) {
  const d = DUR.get(ticks);
  if (!d) throw new Error(`Unsupported duration: ${ticks}`);
  return `<duration>${ticks}</duration><type>${d[0]}</type>${"<dot/>".repeat(d[1])}`;
}

function pitchXml(pitch, shift=0) {
  const p = pitchFromMidi(midi(typeof pitch === "string" ? pitch : pitch.pitch) + shift);
  return `<pitch><step>${p.step}</step>${p.alter ? `<alter>${p.alter}</alter>` : ""}<octave>${p.octave}</octave></pitch>`;
}

function fingering(note, strings) {
  if (typeof note === "object" && note.string && Number.isInteger(note.fret)) return note;
  const target = midi(typeof note === "string" ? note : note.pitch);
  const choices = strings.map((open, i) => ({ string:strings.length-i, fret:target-midi(open) })).filter(x => x.fret >= 0 && x.fret <= 24);
  if (!choices.length) throw new Error(`No playable fingering for ${typeof note === "string" ? note : note.pitch}`);
  return { pitch:typeof note === "string" ? note : note.pitch, ...choices.sort((a,b)=>a.fret-b.fret)[0] };
}

function eventXml(event, { staff=1, voice=1, shift=0, tab=false, strings=[] }={}) {
  if (event.type === "rest") return `<note><rest${event.duration===16?' measure="yes"':""}/>${durationXml(event.duration)}<voice>${voice}</voice><staff>${staff}</staff></note>`;
  return event.notes.map((raw, i) => {
    const note = tab ? fingering(raw, strings) : raw;
    const tech = tab ? `<notations><technical><string>${note.string}</string><fret>${note.fret}</fret></technical></notations>` : "";
    return `<note>${i?"<chord/>":""}${pitchXml(note,shift)}${durationXml(event.duration)}<voice>${voice}</voice><staff>${staff}</staff>${tab?"<stem>none</stem>":""}${tech}</note>`;
  }).join("");
}

function harmony(symbol) {
  const m=/^([A-G])([#b]?)(.*)$/.exec(symbol); const suffix=m[3];
  const kind=suffix==="maj7"?"major-seventh":suffix==="m7"?"minor-seventh":suffix==="7"?"dominant":suffix==="m"?"minor":"major";
  return `<harmony><root><root-step>${m[1]}</root-step>${m[2]?`<root-alter>${m[2]==="#"?1:-1}</root-alter>`:""}</root><kind text="${suffix}">${kind}</kind></harmony>`;
}

function tuningXml(strings) {
  return strings.map((p,i)=>{const x=pitchFromMidi(midi(p));return `<staff-tuning line="${i+1}"><tuning-step>${x.step}</tuning-step>${x.alter?`<tuning-alter>${x.alter}</tuning-alter>`:""}<tuning-octave>${x.octave}</tuning-octave></staff-tuning>`}).join("");
}

function attributes(inst) {
  const base='<divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>';
  if (inst.layout==="piano") return `<attributes>${base}<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`;
  if (inst.layout==="tab") return `<attributes>${base}<staves>2</staves><clef number="1"><sign>${inst===INSTRUMENTS.bassGuitar?"F":"G"}</sign><line>${inst===INSTRUMENTS.bassGuitar?4:2}</line></clef><clef number="2"><sign>TAB</sign><line>5</line></clef><staff-details number="2"><staff-lines>${inst.strings.length}</staff-lines>${tuningXml(inst.strings)}</staff-details><transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>`;
  const tr=inst.transpose?`<transpose><diatonic>${inst.transpose[0]}</diatonic><chromatic>${inst.transpose[1]}</chromatic>${inst.transpose[2]?`<octave-change>${inst.transpose[2]}</octave-change>`:""}</transpose>`:"";
  return `<attributes>${base}<clef><sign>${inst.clef[0]}</sign><line>${inst.clef[1]}</line></clef>${tr}</attributes>`;
}

function partXml(part, score, showDirections = false) {
  const inst=INSTRUMENTS[part.instrument];
  return part.measures.map((m,i)=>{
    const a=i===0?attributes(inst):"";
    const tempo=showDirections&&i===0?`<direction><direction-type><words>♩ = ${score.tempo}</words></direction-type><sound tempo="${score.tempo}"/></direction>`:"";
    const chord=showDirections?harmony(m.chord||score.harmony[i]):"";
    if(inst.layout==="piano") return `<measure number="${i+1}">${a}${tempo}${chord}${m.treble.map(e=>eventXml(e,{staff:1,voice:1})).join("")}<backup><duration>16</duration></backup>${m.bass.map(e=>eventXml(e,{staff:2,voice:2})).join("")}</measure>`;
    if(inst.layout==="tab") { const ev=m.events; return `<measure number="${i+1}">${a}${tempo}${chord}${ev.map(e=>eventXml(e,{staff:1,voice:1,shift:inst.writtenShift})).join("")}<backup><duration>16</duration></backup>${ev.map(e=>eventXml(e,{staff:2,voice:2,shift:inst.writtenShift,tab:true,strings:inst.strings})).join("")}</measure>`; }
    return `<measure number="${i+1}">${a}${tempo}${chord}${m.events.map(e=>eventXml(e,{shift:inst.writtenShift})).join("")}</measure>`;
  }).join("");
}

export function ensembleToMusicXml(score) {
  const list=score.parts.map((p,i)=>`<score-part id="P${i+1}"><part-name>${esc(p.name||INSTRUMENTS[p.instrument].name)}</part-name></score-part>`).join("");
  const parts=score.parts.map((p,i)=>`<part id="P${i+1}">${partXml(p,score,i===0)}</part>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${esc(score.title)}</work-title></work><part-list>${list}</part-list>${parts}</score-partwise>`;
}
