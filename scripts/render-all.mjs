import { glob } from "node:fs/promises";
import { renderScore } from "./render.mjs";

const files = [];
for await (const file of glob("examples/*.json")) files.push(file);
if (!files.length) throw new Error("No musical sketches found in examples/");

for (const file of files.sort()) await renderScore(file);
