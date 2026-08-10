export const INTERVAL_LEVELS = {
  foundation: [
    { semitones: 0, label: "Unison" },
    { semitones: 4, label: "Major 3rd" },
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 12, label: "Octave" }
  ],
  expanded: [
    { semitones: 0, label: "Unison" },
    { semitones: 2, label: "Major 2nd" },
    { semitones: 4, label: "Major 3rd" },
    { semitones: 5, label: "Perfect 4th" },
    { semitones: 7, label: "Perfect 5th" },
    { semitones: 9, label: "Major 6th" },
    { semitones: 12, label: "Octave" }
  ]
};

export const RHYTHM_PATTERNS = [
  [0, 4, 8, 12],
  [0, 3, 4, 8, 11, 12],
  [0, 2, 6, 8, 10, 14],
  [0, 4, 6, 8, 12, 14],
  [0, 2, 4, 7, 10, 12],
  [0, 3, 6, 8, 11, 14]
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
