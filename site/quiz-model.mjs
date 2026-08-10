export const INTERVAL_LEVELS = {
  foundation: [
    { semitones: 0, label: "Unison" },
    { semitones: 4, label: "Major 3rd" },
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 12, label: "Octave" }
  ],
  intermediate: [
    { semitones: 0, label: "Unison" },
    { semitones: 2, label: "Major 2nd" },
    { semitones: 3, label: "Minor 3rd" },
    { semitones: 4, label: "Major 3rd" },
    { semitones: 5, label: "Perfect 4th" },
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 8, label: "Minor 6th" },
    { semitones: 9, label: "Major 6th" },
    { semitones: 12, label: "Octave" }
  ],
  all: [
    { semitones: 0, label: "Unison" },
    { semitones: 1, label: "Minor 2nd" },
    { semitones: 2, label: "Major 2nd" },
    { semitones: 3, label: "Minor 3rd" },
    { semitones: 4, label: "Major 3rd" },
    { semitones: 5, label: "Perfect 4th" },
    { semitones: 6, label: "Tritone" },
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 8, label: "Minor 6th" },
    { semitones: 9, label: "Major 6th" },
    { semitones: 10, label: "Minor 7th" },
    { semitones: 11, label: "Major 7th" },
    { semitones: 12, label: "Octave" }
  ]
};

export const INTERVAL_SOUNDS = [
  { id: "pure", label: "Pure sine", symbol: "∿", oscillator: "sine", duration: 0.62, attack: 0.018, volume: 0.22 },
  { id: "warm", label: "Warm triangle", symbol: "△", oscillator: "triangle", duration: 0.68, attack: 0.024, volume: 0.16 },
  { id: "bright", label: "Bright square", symbol: "⊓", oscillator: "square", duration: 0.5, attack: 0.012, volume: 0.075 }
];

export const RHYTHM_PATTERNS = [
  [0, 4, 8, 12],
  [0, 2, 4, 6, 8, 10, 12, 14],
  [0, 2, 4, 8, 10, 12],
  [0, 4, 6, 8, 12, 14],
  [0, 3, 4, 8, 11, 12],
  [0, 1, 2, 4, 8, 9, 10, 12]
];

export const RHYTHM_SOUNDS = [
  { id: "click", label: "Dry click", symbol: "△", oscillator: "triangle", startFrequency: 520, endFrequency: 300, duration: 0.085, attack: 0.002, volume: 0.2 },
  { id: "wood", label: "Warm wood", symbol: "⌁", oscillator: "sine", startFrequency: 390, endFrequency: 240, duration: 0.22, attack: 0.006, volume: 0.24 },
  { id: "sustain", label: "Soft sustain", symbol: "∿", oscillator: "sine", startFrequency: 330, endFrequency: 255, duration: 0.48, attack: 0.012, volume: 0.2 }
];

export function chooseDifferentIndex(length, previous = -1, random = Math.random) {
  if (length < 2) return 0;
  let index = Math.floor(random() * length);
  if (index === previous) index = (index + 1) % length;
  return index;
}

export function scoreTappedRhythm(expected, actual) {
  const target = new Set(expected);
  const answer = new Set(actual);
  const matches = [...answer].filter((slot) => target.has(slot)).length;
  if (!target.size && !answer.size) return 100;
  const precision = answer.size ? matches / answer.size : 0;
  const recall = target.size ? matches / target.size : 0;
  return precision + recall ? Math.round(200 * precision * recall / (precision + recall)) : 0;
}
