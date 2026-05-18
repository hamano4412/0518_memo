function normalizeDate(value) {
  if (!value) return '';
  return String(value).trim().replaceAll('-', '/');
}

function todayString() {
  return normalizeDate(new Date().toISOString().slice(0, 10));
}

function inferCompany(text) {
  const patterns = ['株式会社A様', 'NSSOL'];
  return patterns.find((pattern) => text.includes(pattern)) || '';
}

function inferContact(text, ours) {
  const names = Array.from(
    new Set(
      [...text.matchAll(/([一-龠ぁ-んァ-ヶA-Za-z ]{1,30})：/g)]
        .map((match) => match[1].trim())
        .filter((name) => !name.includes('商談') && !name.includes('文字起こし'))
    )
  );
  if (!names.length) return '';
  return ours ? names[0] : (names[1] || '');
}

function inferTemperature(text) {
  const highWords = ['正式', '非常に良い', '決まり', '前向き', '役員会議', 'デモ実施'];
  const midWords = ['検討', '再提案', '課題', '懸念'];
  const score = highWords.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
  const mid = midWords.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
  if (score >= 2) return '高い / 前向き';
  if (score >= 1) return '高い / 関心あり';
  if (mid >= 2) return '中〜高 / 検討前向き';
  return '中 / 情報収集中';
}

function extractSentences(text, keywords, fallback) {
  const sentences = text.split(/[。\n]/).map((sentence) => sentence.trim()).filter(Boolean);
  const picked = sentences.filter((sentence) => keywords.some((keyword) => sentence.includes(keyword)));
  return (picked.slice(0, 3).join('。') || fallback).replace(/。+/g, '。');
}

function generateSummary({ transcript, docUrl, sampleDate }) {
  const body = String(transcript || '').trim();
  if (!body) {
    const error = new Error('文字起こし本文を入力してください。');
    error.statusCode = 400;
    throw error;
  }

  const date = normalizeDate(sampleDate || extractDate(body) || todayString());

  return {
    docUrl: String(docUrl || '').trim(),
    company: inferCompany(body),
    date,
    ourContact: inferContact(body, true),
    theirContact: inferContact(body, false),
    summary: extractSentences(body, ['デモ', '導入', '要件', '比較', '課題', '連携', '活用', '提案'], body.slice(0, 120)),
    temperature: inferTemperature(body),
    decision: extractSentences(body, ['決定', '進める', '送付', '見積', '再提案', 'デモ実施', 'プレゼン'], '次回アクション中心に継続検討。'),
    homework: extractSentences(body, ['までに', '送付', '調整', '準備', '実施', '火曜中', '社内承認'], '次回までの宿題を要整理。'),
    dueDate: ''
  };
}

function extractDate(text) {
  const full = text.match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if (full) {
    return `${full[1]}/${full[2].padStart(2, '0')}/${full[3].padStart(2, '0')}`;
  }
  return '';
}

function validateRecordInput(input) {
  return {
    company: String(input.company || '').trim(),
    date: normalizeDate(input.date) || '—',
    ourContact: String(input.ourContact || '').trim(),
    theirContact: String(input.theirContact || '').trim(),
    summary: String(input.summary || '').trim(),
    decision: String(input.decision || '').trim(),
    homework: String(input.homework || '').trim(),
    dueDate: normalizeDate(input.dueDate)
  };
}

module.exports = { generateSummary, normalizeDate, validateRecordInput };
