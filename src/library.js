import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const root = path.resolve(import.meta.dirname, '..');
export const dist = path.join(root, 'dist');

export async function findIdeas() {
  const songsDir = path.join(root, 'songs');
  const songs = await fs.readdir(songsDir, { withFileTypes: true });
  const files = [];
  for (const song of songs.filter((entry) => entry.isDirectory())) {
    const ideasDir = path.join(songsDir, song.name, 'ideas');
    for (const file of await fs.readdir(ideasDir, { withFileTypes: true })) {
      if (file.isFile() && file.name.endsWith('.json')) files.push(path.join(ideasDir, file.name));
    }
  }
  return files.sort();
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function loadAndValidateIdeas() {
  const schema = await readJson(path.join(root, 'schema', 'musical-idea.schema.json'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ideas = [];
  const seen = new Set();
  for (const file of await findIdeas()) {
    const idea = await readJson(file);
    if (!validate(idea)) {
      const details = ajv.errorsText(validate.errors, { separator: '\n  ' });
      throw new Error(`${path.relative(root, file)} is invalid:\n  ${details}`);
    }
    if (seen.has(idea.id)) throw new Error(`Duplicate idea id: ${idea.id}`);
    seen.add(idea.id);
    validateMusicalTiming(idea);
    ideas.push(idea);
  }
  return ideas;
}

export function measureDuration(score) {
  return score.meter.beats * score.divisions * (4 / score.meter.beatType);
}

export function validateMusicalTiming(idea) {
  const length = measureDuration(idea.score);
  const expectedMeasures = idea.score.parts[0].measures.length;
  for (const part of idea.score.parts) {
    if (part.measures.length !== expectedMeasures) throw new Error(`${idea.id}: all parts must contain the same number of measures`);
    for (const measure of part.measures) {
      let cursor = 0;
      for (const event of [...measure.events].sort((a, b) => a.offset - b.offset)) {
        if (event.offset < cursor) throw new Error(`${idea.id}, measure ${measure.number}: overlapping events are not supported in v0.1`);
        if (event.offset + event.duration > length) throw new Error(`${idea.id}, measure ${measure.number}: event exceeds measure duration`);
        cursor = event.offset + event.duration;
      }
      for (const harmony of measure.harmony) {
        if (harmony.offset >= length) throw new Error(`${idea.id}, measure ${measure.number}: harmony offset is outside the measure`);
      }
    }
  }
}

export function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function escapeHtml(value) {
  return escapeXml(value);
}
