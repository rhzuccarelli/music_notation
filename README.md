# Music Notation Sketchbook

A lightweight pipeline for turning structured musical sketches into engraved
notation:

```text
JSON -> MusicXML -> Verovio -> SVG -> PNG
```

## Quick start

```bash
pnpm install
pnpm test
pnpm build
```

The sample score is written to `generated/sabah-piano-chorus-001/`, and the
static viewer is built in `dist/`.

Every JSON file in `examples/` is validated against
`schema/musical-sketch.schema.json` before rendering. A push to `main` tests,
renders, and deploys the viewer to GitHub Pages.

## Instrument layouts (format version 2)

Multi-instrument sketches use `"formatVersion": 2`, a shared `harmony` array,
and one entry per instrument in `parts`. Supported instrument identifiers are:

- `piano` — treble and bass grand staff
- `trumpetBb` — written B-flat trumpet part
- `trombone` — concert-pitch bass clef
- `altoSaxEb` — written E-flat alto sax part
- `tenorSaxBb` — written B-flat tenor sax part
- `guitar` — standard notation and six-string TAB
- `bassGuitar` — bass-clef notation and four-string TAB

Pitches in JSON are concert pitches. The renderer transposes trumpet, alto sax,
tenor sax, guitar, and bass into their conventional written notation. Guitar
and bass notes may provide `string` and `fret`; when omitted, the renderer
selects a playable standard-tuning position automatically. See
`examples/instrument-layouts-demo.json` for a complete example.
