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
