const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../src/app');

async function startTestServer() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'memo-backend-'));
  const dataFile = path.join(tempDir, 'records.json');
  const app = createApp({ dataFile });
  await app.ready;

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    app,
    dataFile,
    baseUrl,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  };
}

test('POST /api/login authenticates with demo credentials', async () => {
  const harness = await startTestServer();

  const response = await fetch(`${harness.baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginId: 'demo', password: 'demo1234' })
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.user.loginId, 'demo');

  await harness.close();
});

test('POST /api/login rejects invalid credentials', async () => {
  const harness = await startTestServer();

  const response = await fetch(`${harness.baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginId: 'wrong', password: 'bad' })
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.match(body.error, /ID または Password/);

  await harness.close();
});

test('GET /api/bootstrap returns allowed samples and records only', async () => {
  const harness = await startTestServer();

  const response = await fetch(`${harness.baseUrl}/api/bootstrap`);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(Array.isArray(body.samples), true);
  assert.deepEqual(body.samples.map((sample) => sample.key), ['saas', 'erp']);
  assert.equal(body.samples.some((sample) => sample.key === 'nssol'), false);
  assert.equal(Array.isArray(body.records), true);
  assert.equal(body.records.length >= 2, true);

  await harness.close();
});

test('POST /api/summary generates a confirmable record shape', async () => {
  const harness = await startTestServer();

  try {
    const response = await fetch(`${harness.baseUrl}/api/summary`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        docUrl: 'https://docs.google.com/document/d/sample/edit',
        transcript: '商談文字起こし：株式会社A様_SaaS導入検討MTG\n田中：今日は導入デモです。\n佐藤：内容は非常に良いと思います。20日までに最終見積書をください。\n田中：5/18までに見積書PDFを送付します。'
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.company, '株式会社A様');
    assert.equal(body.ourContact, '田中');
    assert.equal(body.theirContact, '佐藤');
    assert.equal(typeof body.summary, 'string');
    assert.equal(typeof body.decision, 'string');
    assert.equal(typeof body.homework, 'string');
    assert.equal(body.dueDate, '');
  } finally {
    await harness.close();
  }
});

test('POST /api/records saves a new record and persists it', async () => {
  const harness = await startTestServer();

  const createResponse = await fetch(`${harness.baseUrl}/api/records`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      company: '新規株式会社',
      date: '2026/05/18',
      ourContact: '田中',
      theirContact: '佐藤',
      summary: '概要',
      decision: '決定事項',
      homework: '宿題',
      dueDate: '2026/05/21'
    })
  });

  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.company, '新規株式会社');
  assert.ok(created.id);

  const bootstrapResponse = await fetch(`${harness.baseUrl}/api/bootstrap`);
  const bootstrap = await bootstrapResponse.json();
  assert.equal(bootstrap.records[0].company, '新規株式会社');

  const persisted = JSON.parse(await fs.readFile(harness.dataFile, 'utf8'));
  assert.equal(persisted.records[0].company, '新規株式会社');

  await harness.close();
});

test('PATCH /api/records/:id updates due date and summary counts', async () => {
  const harness = await startTestServer();

  const bootstrapResponse = await fetch(`${harness.baseUrl}/api/bootstrap`);
  const bootstrap = await bootstrapResponse.json();
  const target = bootstrap.records.find((record) => record.company === '株式会社A様');
  assert.ok(target);

  const patchResponse = await fetch(`${harness.baseUrl}/api/records/${target.id}/due-date`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dueDate: '2026/05/18' })
  });

  assert.equal(patchResponse.status, 200);
  const updated = await patchResponse.json();
  assert.equal(updated.dueDate, '2026/05/18');

  const nextBootstrapResponse = await fetch(`${harness.baseUrl}/api/bootstrap`);
  const nextBootstrap = await nextBootstrapResponse.json();
  const nextTarget = nextBootstrap.records.find((record) => record.id === target.id);
  assert.equal(nextTarget.dueDate, '2026/05/18');

  await harness.close();
});
