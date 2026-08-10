import { buildRhythmMusicXml } from "./rhythm-model.mjs";
import { INTERVAL_LEVELS, INTERVAL_SOUNDS, RHYTHM_PATTERNS, RHYTHM_SOUNDS, VOLUME_LEVELS, chooseDifferentIndex, scoreTappedRhythm } from "./quiz-model.mjs";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let audioContext;
let intervalQuestion;
let intervalScore = { correct: 0, total: 0 };
let rhythmScore = { correct: 0, total: 0 };
let rhythmQuestion = -1;
let tapQuestion = 0;
let tapState = "idle";
let tapStart = 0;
let tapTimes = [];

function setFeedback(target, text, state = "neutral") {
  target.textContent = text;
  target.classList.remove("is-correct", "is-wrong");
  if (state === "correct") target.classList.add("is-correct");
  if (state === "wrong") target.classList.add("is-wrong");
}

async function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext ??= new AudioContextClass();
  if (audioContext.state !== "running") await audioContext.resume();
}

function buildSegmentPicker(target, items, name, selectedId) {
  target.innerHTML = items.map((item) => `<label><input type="radio" name="${name}" value="${item.id}" ${item.id === selectedId ? "checked" : ""}><span class="segment-face"><strong>${item.symbol}</strong><span>${item.label}</span></span></label>`).join("");
}

function selectedValue(name, fallback) {
  return $(`input[name="${name}"]:checked`)?.value ?? fallback;
}

function selectedVolume(name) {
  const id = selectedValue(name, "medium");
  return VOLUME_LEVELS.find((level) => level.id === id)?.multiplier ?? 1;
}

function tone(midi, at, soundId = "pure", volumeMultiplier = 1) {
  const sound = INTERVAL_SOUNDS.find((candidate) => candidate.id === soundId) ?? INTERVAL_SOUNDS[0];
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  osc.type = sound.oscillator;
  osc.frequency.value = frequency;
  filter.type = "lowpass";
  filter.frequency.value = sound.filterFrequency;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(sound.volume * volumeMultiplier, at + sound.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + sound.duration);
  osc.connect(filter).connect(gain).connect(audioContext.destination);
  osc.start(at);
  osc.stop(at + sound.duration + 0.02);
}

function percussion(at, soundId = "click", volumeMultiplier = 1) {
  const sound = RHYTHM_SOUNDS.find((candidate) => candidate.id === soundId) ?? RHYTHM_SOUNDS[0];
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = sound.oscillator;
  osc.frequency.setValueAtTime(sound.startFrequency, at);
  osc.frequency.exponentialRampToValueAtTime(sound.endFrequency, at + sound.duration);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(sound.volume * volumeMultiplier, at + sound.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + sound.duration);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(at);
  osc.stop(at + sound.duration + 0.02);
}

function metronome(at, accent = false) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.value = accent ? 2400 : 1900;
  gain.gain.setValueAtTime(accent ? 0.18 : 0.12, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(at);
  osc.stop(at + 0.035);
}

function newIntervalQuestion() {
  const choices = INTERVAL_LEVELS[$("#interval-level").value];
  const interval = choices[Math.floor(Math.random() * choices.length)];
  const selectedMode = $("#interval-mode").value;
  const mode = selectedMode === "mixed" ? (Math.random() < 0.5 ? "melodic" : "harmonic") : selectedMode;
  intervalQuestion = { ...interval, root: 48 + Math.floor(Math.random() * 12), mode };
  const answers = $("#interval-answers");
  answers.innerHTML = choices.map((choice) => `<button class="answer-button" data-semitones="${choice.semitones}">${choice.label}</button>`).join("");
  $$("#interval-answers .answer-button").forEach((button) => button.addEventListener("click", answerInterval));
  $("#interval-prompt").textContent = `${mode === "melodic" ? "In sequence" : "Together"} · choose the interval`;
  setFeedback($("#interval-feedback"), `Score ${intervalScore.correct} / ${intervalScore.total}`);
}

async function playInterval() {
  await ensureAudio();
  if (!intervalQuestion) newIntervalQuestion();
  const start = audioContext.currentTime + 0.06;
  const soundId = selectedValue("interval-sound", "pure");
  const volume = selectedVolume("interval-volume");
  tone(intervalQuestion.root, start, soundId, volume);
  tone(intervalQuestion.root + intervalQuestion.semitones, intervalQuestion.mode === "melodic" ? start + 0.82 : start, soundId, volume);
}

function answerInterval(event) {
  const answer = Number(event.currentTarget.dataset.semitones);
  const correct = answer === intervalQuestion.semitones;
  intervalScore.total += 1;
  intervalScore.correct += Number(correct);
  $$("#interval-answers .answer-button").forEach((button) => {
    button.disabled = true;
    if (Number(button.dataset.semitones) === intervalQuestion.semitones) button.classList.add("correct");
  });
  if (!correct) event.currentTarget.classList.add("wrong");
  setFeedback($("#interval-feedback"), `${correct ? `Correct · ${intervalQuestion.label}` : `Not quite · ${intervalQuestion.label}`} · score ${intervalScore.correct} / ${intervalScore.total}`, correct ? "correct" : "wrong");
  setTimeout(() => { newIntervalQuestion(); playInterval(); }, 900);
}

function waitForToolkit() {
  if (window.notationToolkit) return Promise.resolve(window.notationToolkit);
  return new Promise((resolve) => window.addEventListener("notation-ready", () => resolve(window.notationToolkit), { once: true }));
}

async function renderRhythm(target, pattern, compact = false) {
  const toolkit = await waitForToolkit();
  const xml = buildRhythmMusicXml({ attacks: pattern, totalSlots: 16, subdivisions: 4, tempo: 100, showTempo: false, partName: "" });
  toolkit.setOptions({ pageWidth: compact ? 1050 : 1500, pageHeight: 650, scale: compact ? 34 : 40, adjustPageHeight: true, breaks: "none", footer: "none", header: "none", spacingStaff: 3 });
  toolkit.loadData(xml);
  target.innerHTML = toolkit.renderToSVG(1);
}

async function newRhythmQuestion() {
  rhythmQuestion = chooseDifferentIndex(RHYTHM_PATTERNS.length, rhythmQuestion);
  const distractors = [];
  while (distractors.length < 2) {
    const index = Math.floor(Math.random() * RHYTHM_PATTERNS.length);
    if (index !== rhythmQuestion && !distractors.includes(index)) distractors.push(index);
  }
  const options = [rhythmQuestion, ...distractors].sort(() => Math.random() - 0.5);
  const container = $("#rhythm-options");
  container.innerHTML = options.map((index, option) => `<button class="notation-option" data-pattern="${index}" aria-label="Rhythm option ${option + 1}"><span>Option ${option + 1}</span><div></div></button>`).join("");
  for (const button of $$(".notation-option")) {
    await renderRhythm(button.querySelector("div"), RHYTHM_PATTERNS[Number(button.dataset.pattern)], true);
    button.addEventListener("click", answerRhythm);
  }
  setFeedback($("#rhythm-feedback"), `Score ${rhythmScore.correct} / ${rhythmScore.total}`);
}

async function playRhythm(pattern = RHYTHM_PATTERNS[rhythmQuestion]) {
  await ensureAudio();
  const beat = 0.6;
  const start = audioContext.currentTime + 0.08;
  for (let i = 0; i < 4; i += 1) metronome(start + i * beat, i === 0);
  const rhythmStart = start + 4 * beat;
  const soundId = selectedValue("rhythm-sound", "click");
  const volume = selectedVolume("rhythm-volume");
  pattern.forEach((slot) => percussion(rhythmStart + slot * beat / 4, soundId, volume));
}

function answerRhythm(event) {
  const answer = Number(event.currentTarget.dataset.pattern);
  const correct = answer === rhythmQuestion;
  rhythmScore.total += 1;
  rhythmScore.correct += Number(correct);
  $$(".notation-option").forEach((button) => {
    button.disabled = true;
    if (Number(button.dataset.pattern) === rhythmQuestion) button.classList.add("correct");
  });
  if (!correct) event.currentTarget.classList.add("wrong");
  setFeedback($("#rhythm-feedback"), `${correct ? "Correct" : "Not quite"} · score ${rhythmScore.correct} / ${rhythmScore.total}`, correct ? "correct" : "wrong");
  setTimeout(() => newRhythmQuestion(), 1000);
}

async function newTapQuestion() {
  tapQuestion = chooseDifferentIndex(RHYTHM_PATTERNS.length, tapQuestion);
  await renderRhythm($("#tap-question-notation"), RHYTHM_PATTERNS[tapQuestion]);
  setFeedback($("#tap-feedback"), "Your score will appear here");
}

async function startTapQuiz() {
  if (tapState !== "idle") return;
  await ensureAudio();
  tapTimes = [];
  tapState = "count-in";
  $("#start-tap-quiz").disabled = true;
  $("#tap-quiz-phase").textContent = "Count in";
  const beat = 0.6;
  const start = audioContext.currentTime + 0.1;
  tapStart = start + 4 * beat;
  for (let i = 0; i < 8; i += 1) metronome(start + i * beat, i % 4 === 0);
  for (let i = 0; i < 4; i += 1) setTimeout(() => $("#tap-quiz-position").textContent = String(4 - i), (start + i * beat - audioContext.currentTime) * 1000);
  setTimeout(() => {
    tapState = "recording";
    $("#quiz-tap-pad").disabled = false;
    $("#tap-quiz-phase").textContent = "Tap now";
    $("#tap-quiz-position").textContent = "1.1";
  }, Math.max(0, (tapStart - audioContext.currentTime) * 1000));
  for (let i = 1; i < 4; i += 1) setTimeout(() => $("#tap-quiz-position").textContent = `1.${i + 1}`, Math.max(0, (tapStart + i * beat - audioContext.currentTime) * 1000));
  setTimeout(finishTapQuiz, Math.max(0, (tapStart + 4 * beat - audioContext.currentTime) * 1000));
}

function recordQuizTap() {
  if (tapState !== "recording") return;
  tapTimes.push(audioContext.currentTime - tapStart);
  const pad = $("#quiz-tap-pad");
  pad.classList.add("active");
  setTimeout(() => pad.classList.remove("active"), 70);
}

function finishTapQuiz() {
  tapState = "idle";
  $("#quiz-tap-pad").disabled = true;
  $("#start-tap-quiz").disabled = false;
  $("#tap-quiz-phase").textContent = "Complete";
  $("#tap-quiz-position").textContent = "—";
  const slotSeconds = 0.6 / 4;
  const answer = [...new Set(tapTimes.map((time) => Math.max(0, Math.min(15, Math.round(time / slotSeconds)))))];
  const score = scoreTappedRhythm(RHYTHM_PATTERNS[tapQuestion], answer);
  setFeedback($("#tap-feedback"), `${score}% match · ${score >= 80 ? "Nicely locked" : score >= 55 ? "Nearly there" : "Try it once more"}`, score >= 80 ? "correct" : score < 55 ? "wrong" : "neutral");
  if (score >= 80) setTimeout(() => newTapQuestion(), 1200);
}

$$('.quiz-tab').forEach((tab) => tab.addEventListener("click", () => {
  $$(".quiz-tab").forEach((item) => { item.classList.toggle("active", item === tab); item.setAttribute("aria-selected", String(item === tab)); });
  $$(".quiz-panel").forEach((panel) => { const active = panel.dataset.quizPanel === tab.dataset.quizTab; panel.classList.toggle("active", active); panel.hidden = !active; });
}));
$$('[data-open-quiz]').forEach((link) => link.addEventListener("click", () => {
  const tab = $(`[data-quiz-tab="${link.dataset.openQuiz}"]`);
  if (tab) tab.click();
}));
$("#play-interval").addEventListener("click", playInterval);
$("#interval-level").addEventListener("change", newIntervalQuestion);
$("#interval-mode").addEventListener("change", newIntervalQuestion);
$("#play-rhythm-question").addEventListener("click", () => playRhythm());
$("#start-tap-quiz").addEventListener("click", startTapQuiz);
$("#quiz-tap-pad").addEventListener("pointerdown", recordQuizTap);
document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat || tapState !== "recording") return;
  event.preventDefault();
  recordQuizTap();
});

buildSegmentPicker($("#interval-sounds"), INTERVAL_SOUNDS, "interval-sound", "pure");
buildSegmentPicker($("#interval-volume"), VOLUME_LEVELS, "interval-volume", "medium");
newIntervalQuestion();
buildSegmentPicker($("#rhythm-sounds"), RHYTHM_SOUNDS, "rhythm-sound", "click");
buildSegmentPicker($("#rhythm-volume"), VOLUME_LEVELS, "rhythm-volume", "medium");
newRhythmQuestion();
newTapQuestion();
