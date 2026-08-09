import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";

const schemaUrl = new URL("../schema/musical-sketch.schema.json", import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
const validateSchema = new Ajv2020({ allErrors: true }).compile(schema);

export function validateScore(score, source = "score") {
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

export async function readAndValidateScore(file) {
  const score = JSON.parse(await readFile(file, "utf8"));
  return validateScore(score, file);
}
