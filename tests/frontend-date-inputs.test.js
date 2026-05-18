const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('date fields are text inputs so users can type dates manually', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.match(html, /id="confirmDate" type="text"/);
  assert.match(html, /id="confirmDueDate" type="text"/);
  assert.match(html, /placeholder="YYYY\/MM\/DD または YYYY-MM-DD"/);
  assert.match(appJs, /type="text"[\s\S]*class="due-date-input"/);
});
