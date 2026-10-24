import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import contactWorker from './worker/index.js';

const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 12_000;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendText(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(message);
}

async function proxyContactRequest(request, response, url) {
  let body;
  try {
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of request) {
      totalBytes += chunk.length;
      if (totalBytes > maxBodyBytes) {
        sendText(response, 413, 'Request too large.');
        return;
      }
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  } catch {
    sendText(response, 400, 'Could not read request.');
    return;
  }

  const headers = new Headers();
  for (const key of ['content-type', 'origin', 'content-length']) {
    if (request.headers[key]) headers.set(key, request.headers[key]);
  }

  const workerRequest = new Request(url, {
    method: request.method,
    headers,
    ...(body.length ? { body } : {}),
  });
  const workerResponse = await contactWorker.fetch(workerRequest, process.env, {});
  response.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers));
  response.end(Buffer.from(await workerResponse.arrayBuffer()));
}

createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  } catch {
    sendText(response, 400, 'Bad request.');
    return;
  }

  if (url.pathname === '/api/contact') {
    try {
      await proxyContactRequest(request, response, url);
    } catch {
      sendText(response, 500, 'The request could not be completed.');
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method not allowed.');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(response, 400, 'Bad request.');
    return;
  }

  const filePath = resolve(publicRoot, `.${pathname}`);
  const pathFromRoot = relative(publicRoot, filePath);
  if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..') {
    sendText(response, 404, 'Not found.');
    return;
  }

  const candidate = filePath.endsWith(sep) ? resolve(filePath, 'index.html') : filePath;
  const fallback = resolve(publicRoot, 'index.html');
  const filePathToServe = existsSync(candidate) && statSync(candidate).isFile() ? candidate : fallback;
  if (!existsSync(filePathToServe)) {
    sendText(response, 404, 'Not found.');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePathToServe)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePathToServe).pipe(response);
}).listen(port, () => {
  console.log(`Shepherd IT is ready at http://localhost:${port}`);
});
