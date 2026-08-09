import { cp, mkdir, rm, writeFile, glob } from "node:fs/promises";
import { renderScore } from "./render.mjs";

const PAGES_BASE = "https://rhzuccarelli.github.io/music_notation";
const GITHUB_BASE = "https://github.com/rhzuccarelli/music_notation";

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

function scoreEntry(score) {
  const relative = `scores/${score.id}`;
  const pageBase = `${PAGES_BASE}/${relative}`;
  return {
    id: score.id,
    title: score.title,
    tempo: score.tempo,
    timeSignature: score.timeSignature,
    formatVersion: score.formatVersion ?? 1,
    source: `${GITHUB_BASE}/blob/main/examples/${score.id}.json`,
    page: `${PAGES_BASE}/#${score.id}`,
    png: `${pageBase}/score.png`,
    svg: `${pageBase}/score.svg`,
    musicxml: `${pageBase}/score.musicxml`,
    relative: {
      png: `${relative}/score.png`,
      svg: `${relative}/score.svg`,
      musicxml: `${relative}/score.musicxml`
    }
  };
}

const entries = scores.map(scoreEntry);
const manifest = {
  version: 2,
  generatedAt: new Date().toISOString(),
  baseUrl: PAGES_BASE,
  scores: entries
};

// General manifest for humans/tools.
await writeFile("dist/manifest.json", JSON.stringify(manifest, null, 2));

// Compact, ID-keyed manifest intended for conversational clients such as ChatGPT.
const chatManifest = {
  version: 1,
  generatedAt: manifest.generatedAt,
  baseUrl: PAGES_BASE,
  byId: Object.fromEntries(entries.map((entry) => [entry.id, {
    title: entry.title,
    png: entry.png,
    svg: entry.svg,
    musicxml: entry.musicxml,
    source: entry.source
  }]))
};
await writeFile("dist/chat-manifest.json", JSON.stringify(chatManifest, null, 2));

for (const entry of entries) {
  await writeFile(`dist/scores/${entry.id}/metadata.json`, JSON.stringify(entry, null, 2));
}

const cards = entries.map((score) => `
  <article class="score-card" id="${score.id}">
    <h2>${score.title}</h2>
    <p>${score.tempo} BPM · ${score.timeSignature}</p>
    <a href="${score.svg}"><img src="${score.png}" alt="Notation for ${score.title}" loading="lazy"></a>
    <nav><a href="${score.musicxml}">MusicXML</a><a href="${score.svg}">SVG</a><a href="${score.png}">PNG</a><a href="scores/${score.id}/metadata.json">Metadata</a></nav>
  </article>`).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Music Notation Sketchbook</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#1c1917;background:#f5f2ec}body{max-width:1100px;margin:auto;padding:48px 24px}header{margin-bottom:36px}h1{font-family:Georgia,serif;font-size:clamp(2rem,5vw,4rem);margin:0 0 8px}.score-card{background:white;border:1px solid #ddd6ca;border-radius:16px;padding:24px;margin:24px 0;box-shadow:0 8px 30px #463b2c12}.score-card h2{margin:0}.score-card img{display:block;width:100%;height:auto;margin:20px 0;border-radius:8px}.score-card nav{display:flex;gap:18px;flex-wrap:wrap}.score-card a{color:#76522d;text-underline-offset:3px}
</style></head><body><header><h1>Music Notation Sketchbook</h1><p>Structured musical ideas, engraved with Verovio.</p><p><a href="chat-manifest.json">Chat manifest</a> · <a href="manifest.json">Full manifest</a></p></header><main>${cards}</main></body></html>`;
await writeFile("dist/index.html", html);
await writeFile("dist/.nojekyll", "");
console.log(`Built viewer with ${scores.length} score(s)`);
