const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('today status uses local date instead of UTC to mark same-day deadlines yellow', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  assert.match(appJs, /function todayString\(\)/);
  assert.doesNotMatch(appJs, /toISOString\(\)\.slice\(0, 10\)/);
  assert.match(appJs, /getFullYear\(\)/);
  assert.match(appJs, /getMonth\(\) \+ 1/);
  assert.match(appJs, /getDate\(\)/);
});
