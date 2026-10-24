import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "dist");
const html = await readFile(resolve(projectRoot, "public/index.html"), "utf8");
const workerTemplate = await readFile(resolve(projectRoot, "worker/index.js"), "utf8");
const marker = 'const PAGE = "__SITE_HTML__";';

if (workerTemplate.split(marker).length !== 2) {
  throw new Error("worker/index.js must contain exactly one HTML page marker.");
}

const worker = workerTemplate.replace(marker, `const PAGE = ${JSON.stringify(html)};`);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(resolve(outputRoot, "server"), { recursive: true });
await mkdir(resolve(outputRoot, ".openai"), { recursive: true });
await writeFile(resolve(outputRoot, "server/index.js"), worker);
await copyFile(resolve(projectRoot, ".openai/hosting.json"), resolve(outputRoot, ".openai/hosting.json"));

console.log("Built dist/server/index.js and copied the Site manifest.");
