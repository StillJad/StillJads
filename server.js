const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(body));
}

function postJsonWithHttps(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(payload);
    const request = https.request(
      url,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      },
      (response) => {
        let raw = '';
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode || 500,
            text: raw
          });
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.write(requestBody);
    request.end();
  });
}

async function handleArkLabsProxy(req, res) {
  let raw = '';
  for await (const chunk of req) raw += chunk;

  let parsed;
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  const apiKey = process.env.ARK_LABS_API_KEY || parsed.apiKey;
  const model = parsed.model || 'gpt-4o';
  const prompt = parsed.prompt || '';

  if (!apiKey) {
    sendJson(res, 400, { error: 'Missing API key. Set ARK_LABS_API_KEY or provide apiKey in request body.' });
    return;
  }

  try {
    const payload = {
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful O-level tutor. Keep explanations concise, exam-focused, and practical.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    };

    const upstream = typeof fetch === 'function'
      ? await fetch('https://api.ark-labs.cloud/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text()
      }))
      : await postJsonWithHttps('https://api.ark-labs.cloud/api/v1/chat/completions', headers, payload);

    res.writeHead(upstream.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(upstream.text);
  } catch (error) {
    sendJson(res, 502, {
      error: 'Could not reach Ark Labs upstream API.',
      detail: error?.message || 'Unknown proxy network error.'
    });
  }
}

function handleStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.normalize(filePath).replace(/^\.\.(\/|\\|$)/, '');
  const fullPath = path.join(ROOT, filePath);

  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/ark-labs/chat') {
    handleArkLabsProxy(req, res);
    return;
  }

  if (req.method === 'GET') {
    handleStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`StudyLift running at http://localhost:${PORT}`);
});
