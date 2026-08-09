import { cp, mkdir, readFile, rm, writeFile, glob } from "node:fs/promises";
import { renderScore } from "./render.mjs";

const scores = [];
for await (const file of glob("examples/*.json")) {
  const { score } = await renderScore(file);
  scores.push(score);
}
scores.sort((a, b) => a.title.localeCompare(b.title));

await rm("dist", { recursive: true, force: true });
await mkdir("dist/scores", { recursive: true });
for (const score of scores) {
  await cp(`generated/${score.id}`, `dist/scores/${score.id}`, { recursive: true });
}
await cp("schema", "dist/schema", { recursive: true });

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  scores: scores.map((score) => ({
    id: score.id,
    title: score.title,
    tempo: score.tempo,
    timeSignature: score.timeSignature,
    png: `scores/${score.id}/score.png`,
    svg: `scores/${score.id}/score.svg`,
    musicxml: `scores/${score.id}/score.musicxml`
  }))
};
await writeFile("dist/manifest.json", JSON.stringify(manifest, null, 2));

const cards = scores.map((score) => `
  <article class="score-card" id="${score.id}">
    <h2>${score.title}</h2>
    <p>${score.tempo} BPM · ${score.timeSignature}</p>
    <a href="scores/${score.id}/score.svg"><img src="scores/${score.id}/score.png" alt="Notation for ${score.title}" loading="lazy"></a>
    <nav><a href="scores/${score.id}/score.musicxml">MusicXML</a><a href="scores/${score.id}/score.svg">SVG</a><a href="scores/${score.id}/score.png">PNG</a></nav>
  </article>`).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Music Notation Sketchbook</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#1c1917;background:#f5f2ec}body{max-width:1100px;margin:auto;padding:48px 24px}header{margin-bottom:36px}h1{font-family:Georgia,serif;font-size:clamp(2rem,5vw,4rem);margin:0 0 8px}.score-card{background:white;border:1px solid #ddd6ca;border-radius:16px;padding:24px;margin:24px 0;box-shadow:0 8px 30px #463b2c12}.score-card h2{margin:0}.score-card img{display:block;width:100%;height:auto;margin:20px 0;border-radius:8px}.score-card nav{display:flex;gap:18px;flex-wrap:wrap}.score-card a{color:#76522d;text-underline-offset:3px}
</style></head><body><header><h1>Music Notation Sketchbook</h1><p>Structured musical ideas, engraved with Verovio.</p></header><main>${cards}</main></body></html>`;
await writeFile("dist/index.html", html);
await writeFile("dist/.nojekyll", "");
console.log(`Built viewer with ${scores.length} score(s)`);
