import { cp, mkdir, rm, writeFile, readFile, glob } from "node:fs/promises";
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
await mkdir("dist/songbooks", { recursive: true });
for (const score of scores) {
  await cp(`generated/${score.id}`, `dist/scores/${score.id}`, { recursive: true });
}
await cp("schema", "dist/schema", { recursive: true });
await cp("site/rhythm-capture.js", "dist/rhythm-capture.js");
await cp("site/rhythm-model.mjs", "dist/rhythm-model.mjs");
await cp("site/style.css", "dist/style.css");
await cp("site/quiz.js", "dist/quiz.js");
await cp("site/quiz-model.mjs", "dist/quiz-model.mjs");
await cp("site/quiz.css", "dist/quiz.css");
await cp("site/landing.css", "dist/landing.css");
await cp("site/versions.json", "dist/versions.json");
await cp("site/songbook.css", "dist/songbook.css");
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

const versions = JSON.parse(await readFile("site/versions.json", "utf8"));
const currentVersion = versions[0];
const songbookConfig = JSON.parse(await readFile("site/songbooks.json", "utf8"));
const songbooks = songbookConfig.songs.map((song) => ({
  ...song,
  scores: entries.filter((score) => score.id.startsWith(song.idPrefix))
})).filter((song) => song.scores.length);
const versionCards = versions.map((version) => `
  <article class="version-entry">
    <div><strong>v${version.version}</strong><time datetime="${version.date}">${version.date}</time></div>
    <h3>${version.title}</h3>
    <p>${version.summary}</p>
  </article>`).join("");

const songbookCards = songbooks.map((song) => `
  <article class="songbook-card">
    <span>${String(song.scores.length).padStart(2, "0")} ideas</span>
    <h3>${song.title}</h3>
    <p>${song.description}</p>
    <a class="btn" href="songbooks/${song.id}.html">Open A5 songbook</a>
  </article>`).join("");

function songbookHtml(song) {
  const ideas = song.scores.map((score, index) => `
    <section class="idea-page">
      <header><span>${song.title} / Idea ${String(index + 1).padStart(2, "0")}</span><span>${score.tempo} BPM · ${score.timeSignature}</span></header>
      <h2>${score.title}</h2>
      <figure><img src="../${score.relative.svg}" alt="Notation for ${score.title}"></figure>
      <footer><span>Music Notation Sketchbook</span><span>${index + 1} / ${song.scores.length}</span></footer>
    </section>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${song.title} — A5 Songbook</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><link rel="stylesheet" href="../songbook.css"></head><body><nav class="print-controls"><a href="../#songbooks">← Back to songbooks</a><button onclick="window.print()">Print / Save PDF</button></nav><main><section class="cover"><p>Music Notation Sketchbook</p><h1>${song.title}</h1><div><span>A5 songbook</span><span>${song.scores.length} musical ideas</span><span>v${currentVersion.version}</span></div></section>${ideas}</main></body></html>`;
}

for (const song of songbooks) {
  await writeFile(`dist/songbooks/${song.id}.html`, songbookHtml(song));
}

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
  <link rel="stylesheet" href="quiz.css">
  <link rel="stylesheet" href="landing.css">
</head>
<body>
  <header class="site-header">
    <a class="logo" href="#top" aria-label="Music Notation Sketchbook home"><span class="logo-square"></span><span class="brand-name">Music Notation</span><span class="logo-tag">Sketchbook</span></a>
    <nav class="header-actions" aria-label="Primary navigation"><a href="#tools">Tools</a><a href="#scores">Scores</a><a href="#versions">Versions</a></nav>
  </header>
  <main id="top">
    <section class="hero landing-hero">
      <p class="eyebrow">Music notation sketchbook / v${currentVersion.version}</p>
      <h1>Music,<br>made visible.</h1>
      <p class="hero-copy">Capture ideas, train your ear, practise rhythm and keep every musical sketch in one place.</p>
    </section>

    <section class="tool-launcher" id="tools" aria-labelledby="tools-title">
      <div class="section-heading"><span id="tools-title"><i></i>Choose a tool</span><small>06 functions</small></div>
      <nav class="launcher-grid" aria-label="Music tools">
        <a class="launcher-card" href="#rhythm-capture"><span class="launcher-number">01</span><span class="tool-icon icon-capture" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong>Rhythm capture</strong><small>Tap an idea and engrave it</small></a>
        <a class="launcher-card" href="#ear-training" data-open-quiz="intervals"><span class="launcher-number">02</span><span class="tool-icon icon-interval" aria-hidden="true"><i></i><i></i></span><strong>Intervals</strong><small>Train melodic and harmonic distance</small></a>
        <a class="launcher-card" href="#ear-training" data-open-quiz="hear-rhythm"><span class="launcher-number">03</span><span class="tool-icon icon-hear" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><strong>Hear rhythm</strong><small>Match sound to notation</small></a>
        <a class="launcher-card" href="#ear-training" data-open-quiz="tap-rhythm"><span class="launcher-number">04</span><span class="tool-icon icon-tap" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong>Tap rhythm</strong><small>Read notation and play it back</small></a>
        <a class="launcher-card" href="#scores"><span class="launcher-number">05</span><span class="tool-icon icon-library" aria-hidden="true"><i></i><i></i><i></i></span><strong>Score library</strong><small>Browse every musical sketch</small></a>
        <a class="launcher-card" href="#songbooks"><span class="launcher-number">06</span><span class="tool-icon icon-songbook" aria-hidden="true"><i></i><i></i></span><strong>Songbooks</strong><small>Print every idea by song in A5</small></a>
      </nav>
    </section>

    <section class="songbooks" id="songbooks">
      <div class="section-heading"><span><i></i>A5 songbooks</span><small>${songbooks.length} songs</small></div>
      <div class="songbook-grid">${songbookCards}</div>
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
          <label class="check" style="margin-top:12px"><input id="metronome-sound" type="checkbox" checked><span>Metronome sound</span></label>
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

    <section class="quiz-section" id="ear-training" aria-labelledby="quiz-title">
      <div class="section-heading"><span id="quiz-title"><i></i>Ear & rhythm training</span><small>Prototype / 03 modes</small></div>
      <div class="quiz-tabs" role="tablist" aria-label="Training modes">
        <button class="quiz-tab active" data-quiz-tab="intervals" role="tab" aria-selected="true">01 / Intervals</button>
        <button class="quiz-tab" data-quiz-tab="hear-rhythm" role="tab" aria-selected="false">02 / Hear rhythm</button>
        <button class="quiz-tab" data-quiz-tab="tap-rhythm" role="tab" aria-selected="false">03 / Tap rhythm</button>
      </div>

      <div class="quiz-panel active" data-quiz-panel="intervals">
        <div class="quiz-intro"><p class="eyebrow">Interval recognition</p><h2>Hear the distance.</h2><p>Listen to two notes, then identify the interval between them.</p></div>
        <div class="quiz-workspace">
          <div class="quiz-controls interval-controls">
            <label>Playback<select id="interval-mode"><option value="mixed">Mixed</option><option value="melodic">In sequence</option><option value="harmonic">Together</option></select></label>
            <label>Level<select id="interval-level"><option value="foundation">Foundation</option><option value="intermediate">Intermediate</option><option value="all">All intervals</option></select></label>
            <fieldset class="sound-picker"><legend>Sound</legend><div class="sound-segments" id="interval-sounds" aria-label="Interval sound"></div></fieldset>
          </div>
          <div class="quiz-stage">
            <p class="quiz-prompt" id="interval-prompt">Press play and listen</p>
            <button class="listen-button" id="play-interval" aria-label="Play interval"><span>▶</span><small>Play interval</small></button>
            <div class="answer-grid" id="interval-answers"></div>
            <p class="quiz-feedback" id="interval-feedback" aria-live="polite">Score 0 / 0</p>
          </div>
        </div>
      </div>

      <div class="quiz-panel" data-quiz-panel="hear-rhythm" hidden>
        <div class="quiz-intro"><p class="eyebrow">Rhythm dictation</p><h2>Hear it. Find it.</h2><p>Listen to one bar, then choose the notation that matches.</p></div>
        <div class="quiz-stage rhythm-quiz-stage">
          <div class="rhythm-playback-controls">
            <fieldset class="sound-picker"><legend>Sound</legend><div class="sound-segments" id="rhythm-sounds" aria-label="Rhythm sound"></div></fieldset>
            <button class="btn btn-primary" id="play-rhythm-question">Play rhythm</button>
          </div>
          <div class="notation-options" id="rhythm-options"></div>
          <p class="quiz-feedback" id="rhythm-feedback" aria-live="polite">Score 0 / 0</p>
        </div>
      </div>

      <div class="quiz-panel" data-quiz-panel="tap-rhythm" hidden>
        <div class="quiz-intro"><p class="eyebrow">Rhythm reading</p><h2>Read it. Tap it.</h2><p>Study the notation, take a four-beat count-in, then tap the rhythm back.</p></div>
        <div class="quiz-stage rhythm-quiz-stage">
          <div class="quiz-notation" id="tap-question-notation"><p>LOADING RHYTHM</p></div>
          <div class="tap-quiz-status"><span id="tap-quiz-phase">Ready</span><strong id="tap-quiz-position">—</strong></div>
          <button class="quiz-tap-pad" id="quiz-tap-pad" disabled><span>Tap</span><small>Answer pad</small></button>
          <button class="btn btn-primary quiz-main-action" id="start-tap-quiz">Start answer</button>
          <p class="quiz-feedback" id="tap-feedback" aria-live="polite">Your score will appear here</p>
        </div>
      </div>
    </section>

    <section class="scores" id="scores">
      <div class="section-heading"><span><i></i>Score library</span><small>${entries.length} sketches</small></div>
      <div class="score-list">${cards}</div>
    </section>
    <section class="versions" id="versions">
      <div class="section-heading"><span><i></i>Version history</span><small>Current / v${currentVersion.version}</small></div>
      <div class="version-list">${versionCards}</div>
    </section>
    <footer><span>Music Notation Sketchbook · v${currentVersion.version}</span><nav><a href="versions.json">Version data</a><a href="chat-manifest.json">Chat manifest</a><a href="manifest.json">Full manifest</a></nav></footer>
  </main>
  <script type="module" src="rhythm-capture.js"></script>
  <script type="module" src="quiz.js"></script>
</body>
</html>`;
await writeFile("dist/index.html", html);
await writeFile("dist/.nojekyll", "");
console.log(`Built viewer with ${scores.length} score(s)`);
