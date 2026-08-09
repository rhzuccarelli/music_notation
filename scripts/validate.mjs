import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { INSTRUMENTS } from "./instruments.mjs";

const schemaUrl = new URL("../schema/musical-sketch.schema.json", import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
const validateSchema = new Ajv2020({ allErrors: true }).compile(schema);

export function validateScore(score, source = "score") {
  if (score.formatVersion === 2) return validateEnsemble(score, source);
  if (!validateSchema(score)) {
    const details = validateSchema.errors
      .map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
      .join("; ");
    throw new Error(`${source} does not match the musical sketch schema: ${details}`);
  }

  score.measures.forEach((measure, index) => {
    const ticks = measure.events.reduce((sum, event) => sum + event.duration, 0);
    if (ticks !== 16) {
      throw new Error(`${source}, measure ${index + 1}: expected 16 ticks, received ${ticks}`);
    }
  });
  return score;
}

function assertEvents(events, source) {
  if (!Array.isArray(events) || !events.length) throw new Error(`${source}: events must not be empty`);
  const ticks=events.reduce((n,e)=>n+e.duration,0);
  if(ticks!==16) throw new Error(`${source}: expected 16 ticks, received ${ticks}`);
  for(const event of events) {
    if(![1,2,3,4,6,8,12,16].includes(event.duration)) throw new Error(`${source}: unsupported duration ${event.duration}`);
    if(event.type==="chord" && (!event.notes?.length)) throw new Error(`${source}: chord needs notes`);
  }
}

function validateEnsemble(score, source) {
  if(!score.id || !score.title || !Number.isInteger(score.tempo) || score.timeSignature!=="4/4") throw new Error(`${source}: invalid ensemble metadata`);
  if(!Array.isArray(score.harmony) || !score.harmony.length) throw new Error(`${source}: harmony is required`);
  if(!Array.isArray(score.parts) || !score.parts.length) throw new Error(`${source}: parts are required`);
  for(const part of score.parts) {
    const inst=INSTRUMENTS[part.instrument];
    if(!inst) throw new Error(`${source}: unsupported instrument ${part.instrument}`);
    if(part.measures?.length!==score.harmony.length) throw new Error(`${source}: ${part.id} measure count must match harmony`);
    part.measures.forEach((m,i)=>{
      if(inst.layout==="piano") { assertEvents(m.treble,`${part.id} measure ${i+1} treble`); assertEvents(m.bass,`${part.id} measure ${i+1} bass`); }
      else assertEvents(m.events,`${part.id} measure ${i+1}`);
    });
  }
  return score;
}

export async function readAndValidateScore(file) {
  const score = JSON.parse(await readFile(file, "utf8"));
  return validateScore(score, file);
}
