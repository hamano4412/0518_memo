const test = require('node:test');
const assert = require('node:assert/strict');

const { generateSummary, inferCompany, inferDueDate } = require('../src/domain');

test('inferCompany detects common legal-entity patterns', () => {
  assert.equal(inferCompany('本日は合同会社テスト様との打ち合わせです'), '合同会社テスト様');
  assert.equal(inferCompany('商談：サンプル商事株式会社_初回提案'), 'サンプル商事株式会社');
});

test('inferDueDate extracts explicit month/day deadlines using base year', () => {
  assert.equal(inferDueDate('田中：5/20（水）までに見積書PDFを送付します。', '2026/05/18'), '2026/05/20');
});

test('generateSummary returns rule-based metadata and split decisions/homework', () => {
  const summary = generateSummary({
    docUrl: 'https://docs.google.com/document/d/example/edit',
    sampleDate: '2026/05/18',
    transcript: [
      '商談文字起こし：株式会社A様_SaaS導入検討MTG',
      '田中：今日は導入デモとSlack連携の設定方法をご説明します。',
      '佐藤：内容は非常に良いと思います。20日までに最終見積書をください。',
      '田中：5/19までに見積書PDFと簡易マニュアルを送付します。'
    ].join('\n')
  });

  assert.equal(summary.company, '株式会社A様');
  assert.equal(summary.extractionMode, 'rule-based');
  assert.equal(summary.extractionProvider, 'local-rules');
  assert.equal(summary.dueDate, '2026/05/20');
  assert.match(summary.summary, /導入デモ/);
  assert.match(summary.homework, /見積書PDF/);
});

test('generateSummary separates customer decisions from our homework more clearly', () => {
  const summary = generateSummary({
    docUrl: 'https://docs.google.com/document/d/example-2/edit',
    sampleDate: '2026/05/18',
    transcript: [
      '商談文字起こし：合同会社テスト様_再提案MTG',
      '山田：まずは再提案の方向性をすり合わせたいです。',
      '鈴木：社内では来週の役員会議に上げる前提で進めます。',
      '鈴木：比較表と費用感があれば判断できます。',
      '山田：5/21までに比較表と見積書を送付します。'
    ].join('\n')
  });

  assert.match(summary.decision, /役員会議/);
  assert.doesNotMatch(summary.decision, /5\/21までに比較表と見積書を送付/);
  assert.match(summary.homework, /5\/21までに比較表と見積書を送付/);
  assert.doesNotMatch(summary.homework, /役員会議/);
});
