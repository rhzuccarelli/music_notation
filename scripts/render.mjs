import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import createVerovioModule from "verovio/wasm";
import { VerovioToolkit } from "verovio/esm";
import { toMusicXml } from "./musicxml.mjs";
import { ensembleToMusicXml } from "./ensemble-musicxml.mjs";
import { readAndValidateScore } from "./validate.mjs";

export async function renderScore(source) {
  const score = await readAndValidateScore(source);
  const outputDir = path.join("generated", score.id);
  await mkdir(outputDir, { recursive: true });

  const musicXml = score.formatVersion === 2 ? ensembleToMusicXml(score) : toMusicXml(score);
  await writeFile(path.join(outputDir, "score.musicxml"), musicXml);

  const module = await createVerovioModule();
  const toolkit = new VerovioToolkit(module);
  toolkit.setOptions({
    pageWidth: 2100,
    pageHeight: 900,
    scale: 45,
    adjustPageHeight: true,
    breaks: "none",
    footer: "none",
    header: "none"
  });
  toolkit.loadData(musicXml);
  const svg = toolkit.renderToSVG(1, false).replace(
    "</style>",
    "g.harm tspan { font-size: 280px !important; } g.tempo tspan { font-size: 260px !important; } g.label tspan { font-size: 250px !important; }</style>"
  );
  await writeFile(path.join(outputDir, "score.svg"), svg);
  await sharp(Buffer.from(svg), { density: 288 })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.join(outputDir, "score.png"));

  console.log(`Rendered ${score.id}: MusicXML, SVG and PNG`);
  return { score, outputDir };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const source = process.argv[2];
  if (!source) throw new Error("Usage: node scripts/render.mjs <score.json>");
  await renderScore(source);
}
