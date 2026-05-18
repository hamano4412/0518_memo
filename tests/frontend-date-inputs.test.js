const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('due date fields use calendar inputs and google doc url input is removed', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.doesNotMatch(html, /id="docUrl"/);
  assert.doesNotMatch(html, /Google Doc URL/);
  assert.match(html, /id="confirmDueDate" type="date"/);
  assert.match(appJs, /type="date"[\s\S]*class="due-date-input"/);
  assert.doesNotMatch(appJs, /docUrl/);
});
