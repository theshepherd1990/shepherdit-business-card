import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");
const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);

const config = JSON.parse(manifest);
assert.equal(config.project_id, "appgprj_6adc1c9f571c81918c29196e92f85798");
assert.equal(config.static, undefined, "Worker Sites must not declare a static directory.");

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const worker = await import(moduleUrl);
assert.equal(typeof worker.default?.fetch, "function", `${pathToFileURL(workerPath)} must export default.fetch`);
assert.match(source, /env\.RE_API_KEY/);
assert.match(source, /env\.CONTACT_TO_EMAIL/);
assert.match(source, /reply_to: email/);
assert.doesNotMatch(source, /nicholas@salsbury\.org/i, "The private recipient address must not enter the Worker source.");

console.log("Worker artifact and required email bindings are valid.");
