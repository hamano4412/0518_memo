const test = require('node:test');
const assert = require('node:assert/strict');

const { createSummaryService, parseJsonObject, normalizeSummaryPayload } = require('../src/summary-service');

test('parseJsonObject extracts JSON even when wrapped in prose', () => {
  const result = parseJsonObject('```json\n{"company":"株式会社A様"}\n```');
  assert.equal(result.company, '株式会社A様');
});

test('normalizeSummaryPayload coerces fields into frontend shape', () => {
  const result = normalizeSummaryPayload({
    company: ' 株式会社A様 ',
    date: '2026-05-18',
    ourContact: '田中',
    theirContact: '佐藤',
    summary: '要約',
    temperature: '高い / 前向き',
    decision: '見積送付',
    homework: '提案書作成',
    dueDate: '2026-05-20'
  });

  assert.deepEqual(result, {
    company: '株式会社A様',
    date: '2026/05/18',
    ourContact: '田中',
    theirContact: '佐藤',
    summary: '要約',
    temperature: '高い / 前向き',
    decision: '見積送付',
    homework: '提案書作成',
    dueDate: '2026/05/20'
  });
});

test('createSummaryService falls back to rule-based mode when OPENAI_API_KEY is missing', async () => {
  const service = createSummaryService({
    env: {},
    fallbackGenerateSummary: () => ({
      docUrl: '',
      company: '株式会社A様',
      date: '2026/05/18',
      ourContact: '田中',
      theirContact: '佐藤',
      summary: 'ルールベース要約',
      temperature: '中 / 検討中',
      decision: '次回確認',
      homework: '資料送付',
      dueDate: ''
    })
  });

  const result = await service.summarize({ transcript: 'dummy' });
  assert.equal(result.extractionMode, 'rule-based');
  assert.equal(result.company, '株式会社A様');
});
