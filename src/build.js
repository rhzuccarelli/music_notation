import fs from 'node:fs/promises';
import path from 'node:path';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import { Resvg } from '@resvg/resvg-js';
import { dist, escapeHtml, loadAndValidateIdeas, root } from './library.js';
import { toMusicXml } from './musicxml.js';

const ideas = await loadAndValidateIdeas();
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

const VerovioModule = await createVerovioModule();
const toolkit = new VerovioToolkit(VerovioModule);
toolkit.setOptions({
  inputFrom: 'musicxml',
  pageWidth: 2100,
  pageHeight: 800,
  scale: 45,
  adjustPageHeight: true,
  breaks: 'none',
  footer: 'none',
  header: 'none'
});

const manifest = { schemaVersion: '0.1', generatedAt: new Date().toISOString(), ideas: [] };

for (const idea of ideas) {
  const output = path.join(dist, 'score', idea.id);
  await fs.mkdir(output, { recursive: true });
  const musicxml = toMusicXml(idea);
  toolkit.loadData(musicxml);
  const svg = toolkit.renderToSVG(1, false);
  if (!svg.includes('<svg')) throw new Error(`Verovio did not produce SVG for ${idea.id}`);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1800 }, background: 'white' }).render().asPng();

  const metadata = {
    id: idea.id, version: idea.version, song: idea.song, title: idea.title,
    description: idea.description, status: idea.status,
    instrumentation: idea.score.parts.map((part) => part.name),
    urls: {
      page: `score/${idea.id}/`, musicxml: `score/${idea.id}/score.musicxml`,
      svg: `score/${idea.id}/score.svg`, png: `score/${idea.id}/score.png`
    }
  };
  manifest.ideas.push(metadata);
  await Promise.all([
    fs.writeFile(path.join(output, 'score.musicxml'), musicxml),
    fs.writeFile(path.join(output, 'score.svg'), svg),
    fs.writeFile(path.join(output, 'score.png'), png),
    fs.writeFile(path.join(output, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`),
    fs.writeFile(path.join(output, 'index.html'), scorePage(metadata))
  ]);
}

for (const songName of [...new Set(ideas.map((idea) => idea.song))]) {
  const song = JSON.parse(await fs.readFile(path.join(root, 'songs', songName, 'song.json'), 'utf8'));
  const songIdeas = manifest.ideas.filter((idea) => idea.song === songName);
  const output = path.join(dist, 'song', songName);
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'index.html'), songPage(song, songIdeas));
}

await fs.cp(path.join(root, 'site', 'styles.css'), path.join(dist, 'styles.css'));
await fs.writeFile(path.join(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await fs.writeFile(path.join(dist, 'index.html'), homePage(manifest.ideas));
await fs.writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built ${ideas.length} score${ideas.length === 1 ? '' : 's'} in dist/.`);

function shell(title, body, depth = '../') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${depth}styles.css"></head><body><main>${body}</main></body></html>`;
}

function badge(status) { return `<span class="badge ${status}">${escapeHtml(status)}</span>`; }

function scorePage(score) {
  return shell(score.title, `<nav><a href="../../">Sketchbook</a> · <a href="../../song/${score.song}/">${escapeHtml(score.song)}</a></nav><header><p class="eyebrow">${escapeHtml(score.id)} · version ${score.version}</p><h1>${escapeHtml(score.title)}</h1><p>${badge(score.status)} ${escapeHtml(score.description)}</p></header><section class="paper"><img src="score.svg" alt="Engraved notation for ${escapeHtml(score.title)}"></section><p class="downloads"><a href="score.musicxml">MusicXML</a> · <a href="score.svg">SVG</a> · <a href="score.png">PNG</a> · <a href="metadata.json">metadata</a></p>`, '../../');
}

function songPage(song, ideasForSong) {
  const cards = ideasForSong.map((idea) => `<li><a href="../../score/${idea.id}/"><strong>${escapeHtml(idea.title)}</strong></a> ${badge(idea.status)}<br><small>${escapeHtml(idea.description)}</small></li>`).join('');
  return shell(song.title, `<nav><a href="../../">Sketchbook</a></nav><header><p class="eyebrow">Song</p><h1>${escapeHtml(song.title)}</h1></header><ul class="ideas">${cards}</ul>`, '../../');
}

function homePage(allIdeas) {
  const cards = allIdeas.map((idea) => `<li><a href="score/${idea.id}/"><strong>${escapeHtml(idea.title)}</strong></a> ${badge(idea.status)}<br><small>${escapeHtml(idea.id)} · v${idea.version}</small></li>`).join('');
  return shell('Music Notation Sketchbook', `<header><p class="eyebrow">Open-source musical sketchbook</p><h1>Music Notation</h1><p>Small songwriting and arranging ideas, engraved with Verovio.</p></header><ul class="ideas">${cards}</ul><footer><a href="manifest.json">Machine-readable manifest</a></footer>`, '');
}
