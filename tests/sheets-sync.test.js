const test = require('node:test');
const assert = require('node:assert/strict');

const { createSheetsSync, normalizePrivateKey } = require('../src/sheets-sync');

test('normalizePrivateKey expands escaped newlines', () => {
  assert.equal(normalizePrivateKey('line1\\nline2'), 'line1\nline2');
});

test('createSheetsSync stays disabled without full configuration', () => {
  const sync = createSheetsSync({ env: {} });
  assert.equal(sync.isEnabled(), false);
  assert.deepEqual(sync.describe(), {
    enabled: false,
    spreadsheetId: '',
    sheetName: 'Sheet1'
  });
});
