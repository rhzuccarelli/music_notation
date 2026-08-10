import createVerovioModule from "./vendor/verovio-module.mjs";
import { VerovioToolkit } from "./vendor/verovio.mjs";

const $ = (selector) => document.querySelector(selector);
const tempo = $("#tempo");
const bars = $("#bars");
const grid = $("#grid");
const countIn = $("#count-in");
const startButton = $("#start");
const tapPad = $("#tap-pad");
const captureStatus = $("#capture-status");
const position = $("#position");
const tapCount = $("#tap-count");
const undoButton = $("#undo");
const clearButton = $("#clear");
const playButton = $("#play-pattern");
const downloadButton = $("#download-xml");
const notation = $("#notation");
const resultNote = $("#result-note");
const lights = [...document.querySelectorAll(".beat-lights i")];

let audioContext;
let toolkit;
let state = "idle";
let taps = [];
let quantized = [];
let musicXml = "";
let timer;
let captureStart = 0;
let captureEnd = 0;
let nextClick = 0;
let clickIndex = 0;

createVerovioModule().then((module) => {
  toolkit = new VerovioToolkit(module);
  $("#engine-status").textContent = "Verovio ready";
}).catch(() => {
  $("#engine-status").textContent = "Notation engine unavailable";
});

tempo.addEventListener("input", () => $("#tempo-output").textContent = `${tempo.value} BPM`);
bars.addEventListener("change", () => taps.length && finishPattern());
grid.addEventListener("change", () => finishPattern());
startButton.addEventListener("click", () => state === "idle" ? beginCapture() : stopCapture());
tapPad.addEventListener("pointerdown", captureTap);
undoButton.addEventListener("click", () => { taps.pop(); finishPattern(); });
clearButton.addEventListener("click", clearPattern);
playButton.addEventListener("click", playPattern);
downloadButton.addEventListener("click", downloadMusicXml);
document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat || ["INPUT", "SELECT", "BUTTON"].includes(document.activeElement.tagName)) return;
  event.preventDefault();
  captureTap();
});

function ensureAudio() {
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
}

function click(at, accent = false, note = false) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.frequency.value = note ? 820 : accent ? 1320 : 980;
  gain.gain.setValueAtTime(note ? 0.12 : 0.18, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + (note ? 0.06 : 0.035));
  osc.connect(gain).connect(audioContext.destination);
  osc.start(at);
  osc.stop(at + 0.07);
}

function beginCapture() {
  ensureAudio();
  clearPattern();
  state = countIn.checked ? "count-in" : "recording";
  const beat = 60 / Number(tempo.value);
  const lead = 0.12;
  const countBeats = countIn.checked ? 4 : 0;
  captureStart = audioContext.currentTime + lead + countBeats * beat;
  captureEnd = captureStart + Number(bars.value) * 4 * beat;
  nextClick = audioContext.currentTime + lead;
  clickIndex = -countBeats;
  startButton.textContent = "Stop capture";
  tapPad.disabled = true;
  captureStatus.textContent = countIn.checked ? "Count in" : "Recording";
  timer = setInterval(schedule, 20);
  schedule();
}

function schedule() {
  const beat = 60 / Number(tempo.value);
  while (nextClick < audioContext.currentTime + 0.12 && nextClick < captureEnd) {
    const beatInBar = ((clickIndex % 4) + 4) % 4;
    click(nextClick, beatInBar === 0);
    const visualDelay = Math.max(0, (nextClick - audioContext.currentTime) * 1000);
    const visualIndex = clickIndex;
    setTimeout(() => showBeat(visualIndex), visualDelay);
    nextClick += beat;
    clickIndex += 1;
  }
  if (state === "count-in" && audioContext.currentTime >= captureStart) {
    state = "recording";
    tapPad.disabled = false;
    captureStatus.textContent = "Recording";
  }
  if (audioContext.currentTime >= captureEnd) stopCapture();
}

function showBeat(index) {
  const recordingBeat = Math.max(0, index);
  const currentBar = Math.floor(recordingBeat / 4) + 1;
  const beatInBar = ((index % 4) + 4) % 4;
  lights.forEach((light, i) => light.classList.toggle("active", i === beatInBar));
  position.textContent = index < 0 ? `${Math.abs(index)}…` : `${Math.min(currentBar, Number(bars.value))}.${beatInBar + 1}`;
}

function captureTap() {
  if (state !== "recording") return;
  taps.push(audioContext.currentTime - captureStart);
  tapCount.textContent = String(taps.length).padStart(2, "0");
  tapPad.classList.add("active");
  setTimeout(() => tapPad.classList.remove("active"), 80);
}

function stopCapture() {
  if (state === "idle") return;
  clearInterval(timer);
  state = "idle";
  tapPad.disabled = true;
  startButton.textContent = "Start capture";
  lights.forEach((light) => light.classList.remove("active"));
  position.textContent = "—";
  captureStatus.textContent = taps.length ? "Captured" : "Ready";
  finishPattern();
}

function finishPattern() {
  const subdivisions = Number(grid.value) / 4;
  const totalSlots = Number(bars.value) * 4 * subdivisions;
  const slotSeconds = 60 / Number(tempo.value) / subdivisions;
  quantized = [...new Set(taps.map((time) => Math.max(0, Math.min(totalSlots - 1, Math.round(time / slotSeconds)))))] .sort((a, b) => a - b);
  tapCount.textContent = String(taps.length).padStart(2, "0");
  undoButton.disabled = taps.length === 0;
  clearButton.disabled = taps.length === 0;
  playButton.disabled = quantized.length === 0;
  downloadButton.disabled = quantized.length === 0;
  if (!quantized.length) {
    notation.innerHTML = "<p>YOUR RHYTHM WILL APPEAR HERE</p>";
    resultNote.textContent = `4/4 · ${grid.value === "16" ? "sixteenth" : "eighth"}-note grid · no taps captured`;
    return;
  }
  musicXml = makeMusicXml(quantized, totalSlots, subdivisions);
  renderNotation();
  resultNote.textContent = `4/4 · ${grid.value === "16" ? "sixteenth" : "eighth"}-note grid · ${quantized.length} quantized attacks`;
}

function makeMusicXml(attacks, totalSlots, subdivisions) {
  const divisions = 4;
  const duration = divisions / subdivisions;
  const type = subdivisions === 4 ? "16th" : "eighth";
  const attackSet = new Set(attacks);
  const slotsPerBar = 4 * subdivisions;
  const measures = [];
  for (let slot = 0; slot < totalSlots; slot += slotsPerBar) {
    const notes = Array.from({ length: slotsPerBar }, (_, offset) => attackSet.has(slot + offset)
      ? `<note><pitch><step>C</step><octave>5</octave></pitch><duration>${duration}</duration><voice>1</voice><type>${type}</type><stem>up</stem><notehead>x</notehead></note>`
      : `<note><rest/><duration>${duration}</duration><voice>1</voice><type>${type}</type></note>`).join("");
    const attrs = slot === 0 ? `<attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo.value}</per-minute></metronome></direction-type><sound tempo="${tempo.value}"/></direction>` : "";
    measures.push(`<measure number="${measures.length + 1}">${attrs}${notes}</measure>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="4.0"><work><work-title>Captured rhythm</work-title></work><part-list><score-part id="P1"><part-name>Rhythm</part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
}

function renderNotation() {
  if (!toolkit) {
    notation.innerHTML = "<p>NOTATION ENGINE IS STILL LOADING</p>";
    setTimeout(() => toolkit && renderNotation(), 250);
    return;
  }
  const width = Math.max(1400, Math.min(2600, notation.clientWidth * 2.1));
  toolkit.setOptions({ pageWidth: width, pageHeight: 1000, scale: 42, adjustPageHeight: true, breaks: "auto", footer: "none", header: "none", spacingStaff: 4 });
  toolkit.loadData(musicXml);
  notation.innerHTML = toolkit.renderToSVG(1);
}

function playPattern() {
  ensureAudio();
  const subdivisions = Number(grid.value) / 4;
  const slotSeconds = 60 / Number(tempo.value) / subdivisions;
  const start = audioContext.currentTime + 0.08;
  quantized.forEach((slot) => click(start + slot * slotSeconds, false, true));
}

function clearPattern() {
  taps = [];
  quantized = [];
  musicXml = "";
  finishPattern();
}

function downloadMusicXml() {
  const url = URL.createObjectURL(new Blob([musicXml], { type: "application/vnd.recordare.musicxml+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "captured-rhythm.musicxml";
  link.click();
  URL.revokeObjectURL(url);
}
