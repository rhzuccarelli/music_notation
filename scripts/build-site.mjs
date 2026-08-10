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
await mkdir("dist/vendor", { recursive: true });
for (const score of scores) {
  await cp(`generated/${score.id}`, `dist/scores/${score.id}`, { recursive: true });
}
await cp("schema", "dist/schema", { recursive: true });
await cp("site/rhythm-capture.js", "dist/rhythm-capture.js");
await cp("site/style.css", "dist/style.css");
await cp("node_modules/verovio/dist/verovio.mjs", "dist/vendor/verovio.mjs");
await cp("node_modules/verovio/dist/verovio-module.mjs", "dist/vendor/verovio-module.mjs");

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

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Music Notation Sketchbook</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="site-header">
    <a class="logo" href="#top" aria-label="Music Notation Sketchbook home"><span class="logo-square"></span><span class="brand-name">Music Notation</span><span class="logo-tag">Sketchbook</span></a>
    <nav class="header-actions" aria-label="Primary navigation"><a href="#rhythm-capture">Rhythm capture</a><a href="#scores">Scores</a></nav>
  </header>
  <main id="top">
    <section class="hero">
      <p class="eyebrow">Browser instrument / 01</p>
      <h1>Catch a rhythm<br>before it escapes.</h1>
      <p class="hero-copy">Tap a pattern against the metronome. The sketchbook quantizes it and engraves the result as musical notation.</p>
    </section>

    <section class="tool" id="rhythm-capture" aria-labelledby="rhythm-title">
      <div class="section-heading"><span id="rhythm-title"><i></i>Rhythm capture</span><small id="engine-status">Loading notation engine</small></div>
      <div class="tool-grid">
        <aside class="controls">
          <div class="control-group">
            <label for="tempo">Tempo <output id="tempo-output">100 BPM</output></label>
            <input id="tempo" type="range" min="40" max="220" value="100" step="1">
          </div>
          <div class="control-row">
            <label>Bars<select id="bars"><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>
            <label>Grid<select id="grid"><option value="8">Eighth notes</option><option value="16" selected>Sixteenth notes</option></select></label>
          </div>
          <label class="check"><input id="count-in" type="checkbox" checked><span>One-bar count-in</span></label>
          <div class="mini-actions"><button class="btn" id="undo" disabled>Undo tap</button><button class="btn" id="clear" disabled>Clear</button></div>
          <p class="instructions">Press start, then tap the large pad—or the spacebar—in time. Recording stops after the selected number of bars.</p>
        </aside>

        <div class="capture">
          <div class="capture-display">
            <div><span class="display-label">Status</span><strong id="capture-status">Ready</strong></div>
            <div><span class="display-label">Position</span><strong id="position">—</strong></div>
            <div><span class="display-label">Taps</span><strong id="tap-count">00</strong></div>
          </div>
          <div class="beat-lights" aria-label="Beat indicator"><i></i><i></i><i></i><i></i></div>
          <button class="tap-pad" id="tap-pad" disabled><span>Tap</span><small>Spacebar</small></button>
          <button class="btn btn-primary" id="start">Start capture</button>
        </div>
      </div>
      <div class="result">
        <div class="result-bar"><span>Quantized pattern</span><div><button class="text-button" id="play-pattern" disabled>Play pattern</button><button class="text-button" id="download-xml" disabled>Download MusicXML</button></div></div>
        <div class="notation" id="notation"><p>YOUR RHYTHM WILL APPEAR HERE</p></div>
        <p class="result-note" id="result-note">4/4 · sixteen-note grid · no taps captured</p>
      </div>
    </section>

    <section class="scores" id="scores">
      <div class="section-heading"><span><i></i>Score library</span><small>${entries.length} sketches</small></div>
      <div class="score-list">${cards}</div>
      <footer><span>Music Notation Sketchbook</span><nav><a href="chat-manifest.json">Chat manifest</a><a href="manifest.json">Full manifest</a></nav></footer>
    </section>
  </main>
  <script type="module" src="rhythm-capture.js"></script>
</body>
</html>`;
await writeFile("dist/index.html", html);
await writeFile("dist/.nojekyll", "");
console.log(`Built viewer with ${scores.length} score(s)`);
