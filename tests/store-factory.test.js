const test = require('node:test');
const assert = require('node:assert/strict');

const { createStore } = require('../src/store-factory');
const { RecordStore } = require('../src/store');
const { SupabaseStore, mapRecordFromRow } = require('../src/supabase-store');

test('createStore uses file store when supabase env is absent', () => {
  const store = createStore({
    dataFile: '/tmp/example.json',
    env: {}
  });

  assert.ok(store instanceof RecordStore);
});

test('createStore uses Supabase store when supabase env is present', () => {
  const store = createStore({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'secret-key',
      SUPABASE_TABLE: 'meeting_records'
    }
  });

  assert.ok(store instanceof SupabaseStore);
  assert.equal(store.table, 'meeting_records');
});

test('mapRecordFromRow normalizes date fields for the frontend', () => {
  const record = mapRecordFromRow({
    id: 'abc',
    company: 'テスト株式会社',
    our_contact: '阿部',
    their_contact: '濱野',
    meeting_date: '2026-05-18',
    summary: '要約',
    decision: '決定',
    homework: '宿題',
    due_date: '2026-05-19'
  });

  assert.equal(record.date, '2026/05/18');
  assert.equal(record.dueDate, '2026/05/19');
});
