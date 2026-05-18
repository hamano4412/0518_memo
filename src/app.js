const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const { samples } = require('./sample-data');
const { createSheetsSync } = require('./sheets-sync');
const { createSummaryService } = require('./summary-service');
const { createStore } = require('./store-factory');
const { generateSummary, normalizeDate, validateRecordInput } = require('./domain');

function createApp(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const dataFile = options.dataFile || path.join(rootDir, 'data', 'records.json');
  const env = options.env || process.env;
  const store = options.store || createStore({ dataFile, env });
  const summaryService = options.summaryService || createSummaryService({
    env,
    fallbackGenerateSummary: generateSummary
  });
  const sheetsSync = options.sheetsSync || createSheetsSync({ env });
  const ready = store.init();

  const server = http.createServer(async (req, res) => {
    try {
      await ready;
      const url = new URL(req.url, 'http://127.0.0.1');

      if (url.pathname === '/api/login' && req.method === 'POST') {
        const body = await readJson(req);
        if (body.loginId === 'demo' && body.password === 'demo1234') {
          return sendJson(res, 200, { ok: true, user: { loginId: 'demo' } });
        }
        return sendJson(res, 401, { ok: false, error: 'ID または Password が違います。' });
      }

      if (url.pathname === '/api/bootstrap' && req.method === 'GET') {
        return sendJson(res, 200, {
          samples: samples.map((sample) => ({
            key: sample.key,
            label: sample.label,
            docUrl: sample.docUrl,
            date: sample.date,
            transcript: sample.transcript
          })),
          records: await store.getAll(),
          integrations: {
            sheets: sheetsSync.describe()
          }
        });
      }

      if (url.pathname === '/api/summary' && req.method === 'POST') {
        const body = await readJson(req);
        const matchedSample = samples.find((sample) => sample.docUrl === body.docUrl);
        const summary = await summaryService.summarize({
          docUrl: body.docUrl,
          transcript: body.transcript,
          sampleDate: body.sampleDate || matchedSample?.date || ''
        });
        return sendJson(res, 200, summary);
      }

      if (url.pathname === '/api/records' && req.method === 'POST') {
        const body = await readJson(req);
        const record = validateRecordInput(body);
        const sheetsResult = await sheetsSync.appendRecord(record);
        const created = await store.create({
          ...record,
          sheetSyncStatus: sheetsResult.synced ? 'synced' : sheetsResult.reason || ''
        });
        return sendJson(res, 201, {
          ...created,
          sheetSync: sheetsResult
        });
      }

      const dueDateMatch = url.pathname.match(/^\/api\/records\/([^/]+)\/due-date$/);
      if (dueDateMatch && req.method === 'PATCH') {
        const body = await readJson(req);
        const updated = await store.updateDueDate(dueDateMatch[1], normalizeDate(body.dueDate));
        if (!updated) {
          return sendJson(res, 404, { error: '対象レコードが見つかりません。' });
        }
        return sendJson(res, 200, updated);
      }

      if (req.method === 'GET') {
        return serveStatic(rootDir, url.pathname, res);
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      sendJson(res, statusCode, { error: error.message || 'Internal Server Error' });
    }
  });

  return {
    ready,
    listen(...args) {
      return server.listen(...args);
    }
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('JSON の形式が不正です。');
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

async function serveStatic(rootDir, pathname, res) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(relativePath).replace(/^\.+/, '');
  const filePath = path.join(rootDir, safePath);
  if (!filePath.startsWith(rootDir)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': contentType(filePath) });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }
    throw error;
  }
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

module.exports = { createApp };
