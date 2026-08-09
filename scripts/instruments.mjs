export const INSTRUMENTS = {
  piano: { name: "Piano", layout: "piano" },
  trumpetBb: { name: "Trumpet in B-flat", clef: ["G", 2], writtenShift: 2, transpose: [-1, -2] },
  trombone: { name: "Trombone", clef: ["F", 4], writtenShift: 0 },
  altoSaxEb: { name: "Alto Saxophone in E-flat", clef: ["G", 2], writtenShift: 9, transpose: [-5, -9] },
  tenorSaxBb: { name: "Tenor Saxophone in B-flat", clef: ["G", 2], writtenShift: 14, transpose: [-1, -2, -1] },
  guitar: { name: "Guitar", layout: "tab", strings: ["E2", "A2", "D3", "G3", "B3", "E4"], writtenShift: 12, octaveChange: -1 },
  bassGuitar: { name: "Bass Guitar", layout: "tab", strings: ["E1", "A1", "D2", "G2"], writtenShift: 12, octaveChange: -1 }
};

export const instrumentNames = Object.keys(INSTRUMENTS);
