# Music Notation Sketchbook

A lightweight, static pipeline for turning conversational musical sketches into professionally engraved notation:

```text
musical JSON -> MusicXML -> Verovio SVG -> PNG -> GitHub Pages
```

The JSON files in `songs/` are the source of truth. Everything in `dist/` is generated.

## Quick start

Requires Node.js 22 or newer.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Open `dist/index.html` after building. The first fixture is the four-bar sparse piano idea for the chorus of “Sabah”.

## Adding an idea

1. Copy an existing JSON file under `songs/<song>/ideas/`.
2. Give it a stable lowercase `id` and update its musical events.
3. Run `pnpm test` and `pnpm build`.
4. Commit only the source and intentional project changes; `dist/` is produced by CI.

Rhythms use integer divisions rather than decimal beats. With `divisions: 2`, a quarter note is 2 units, an eighth note is 1 unit, and a 4/4 measure contains 8 units. Event `offset` values are zero-based from the start of a measure.

## v0.1 scope

The compiler currently supports one or more single-staff parts, one voice per staff, pitched notes/chords, generated rests, chord symbols, tempo, key, meter, ties, articulations, and dynamics. Tuplets, pickup measures, multiple simultaneous voices, transposition, MIDI, and grand-staff piano notation are intentionally deferred.

## Stable output URLs

For an idea such as `sabah-piano-chorus-001`, Pages publishes:

- `/score/sabah-piano-chorus-001/`
- `/score/sabah-piano-chorus-001/score.musicxml`
- `/score/sabah-piano-chorus-001/score.svg`
- `/score/sabah-piano-chorus-001/score.png`
- `/manifest.json`

## License

MIT
