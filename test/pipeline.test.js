import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadAndValidateIdeas, root } from '../src/library.js';
import { toMusicXml } from '../src/musicxml.js';

const exec = promisify(execFile);

test('Sabah source validates and compiles expected musical content', async () => {
  const [idea] = await loadAndValidateIdeas();
  assert.equal(idea.id, 'sabah-piano-chorus-001');
  const xml = toMusicXml(idea);
  assert.match(xml, /<work-title>Sabah – Chorus Piano<\/work-title>/);
  assert.equal((xml.match(/<measure number=/g) ?? []).length, 4);
  assert.match(xml, /<step>D<\/step><alter>1<\/alter><octave>4<\/octave>/);
  assert.match(xml, /<kind text="maj7">major-seventh<\/kind>/);
});

test('full build produces MusicXML, Verovio SVG, PNG, and manifest', async () => {
  await exec(process.execPath, ['src/build.js'], { cwd: root });
  const output = path.join(root, 'dist', 'score', 'sabah-piano-chorus-001');
  const svg = await fs.readFile(path.join(output, 'score.svg'), 'utf8');
  const png = await fs.readFile(path.join(output, 'score.png'));
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'dist', 'manifest.json'), 'utf8'));
  assert.match(svg, /<svg/);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(manifest.ideas[0].urls.png, 'score/sabah-piano-chorus-001/score.png');
});
