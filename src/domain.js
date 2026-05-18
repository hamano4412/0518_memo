function normalizeDate(value) {
  if (!value) return '';
  return String(value).trim().replaceAll('-', '/');
}

function todayString() {
  return normalizeDate(new Date().toISOString().slice(0, 10));
}

function splitSentences(text) {
  return String(text || '')
    .split(/[。\n]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function inferCompany(text) {
  const body = String(text || '');
  const heading = body.match(/商談(?:文字起こし)?[:：]\s*([^_\n]+?)(?:[_\n]|$)/);
  if (heading) {
    const cleaned = cleanupCompany(heading[1].replace(/^商談文字起こし[:：]?/, '').trim());
    if (isLikelyCompany(cleaned)) return cleaned;
  }

  const candidates = [];
  const patterns = [
    /((?:株式会社|合同会社|有限会社)[A-Za-z0-9一-龠ぁ-んァ-ヶ・ー]{1,40}(?:様)?)/g,
    /([A-Za-z0-9一-龠ぁ-んァ-ヶ・ー]{1,40}(?:株式会社|合同会社|有限会社)(?:様)?)/g
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const cleaned = cleanupCompany(match[1]);
      if (isLikelyCompany(cleaned)) candidates.push(cleaned);
    }
  }

  if (candidates.length) {
    return candidates.sort((a, b) => b.length - a.length)[0];
  }

  const aliasPatterns = ['NSSOL', 'NS Solutions', '日鉄ソリューションズ'];
  return aliasPatterns.find((pattern) => body.includes(pattern)) || '';
}

function isLikelyCompany(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) return false;
  if (!/(株式会社|合同会社|有限会社|様)/.test(cleaned)) return false;
  const stopPrefixes = ['商談文字起こし', '商談', '本日は', '今日は', '今回の'];
  return !stopPrefixes.some((prefix) => cleaned.startsWith(prefix));
}

function extractSpeakerNames(text) {
  return Array.from(
    new Set(
      [...String(text || '').matchAll(/([一-龠ぁ-んァ-ヶA-Za-z ]{1,30})(?:様)?：/g)]
        .map((match) => match[1].trim())
        .filter((name) => name && !name.includes('商談') && !name.includes('文字起こし'))
    )
  );
}

function inferContact(text, ours) {
  const body = String(text || '');
  const names = extractSpeakerNames(body);
  if (!names.length) return '';

  const customerHintIndex = names.findIndex((name) => new RegExp(`${escapeRegExp(name)}(?:様)?[:：]`).test(body));
  if (ours) return names[0] || '';
  if (customerHintIndex >= 1) return names[customerHintIndex] || '';
  return names[1] || names[0] || '';
}

function inferTemperature(text) {
  const body = String(text || '');
  const highWords = ['非常に良い', '正式', '決定したい', '前向き', '導入したい', '役員会議', '稟議', '見積書', '契約'];
  const midWords = ['検討', '再提案', '課題', '懸念', '比較', '要件', '確認'];
  const lowWords = ['保留', '見送り', '難しい', '厳しい', '予算がない', '凍結'];

  const highScore = countKeywords(body, highWords);
  const midScore = countKeywords(body, midWords);
  const lowScore = countKeywords(body, lowWords);

  if (lowScore >= 1 && highScore === 0) return '低い / 保留';
  if (highScore >= 3) return '高い / 前向き';
  if (highScore >= 1) return '高い / 関心あり';
  if (midScore >= 2) return '中〜高 / 検討前向き';
  return '中 / 情報収集中';
}

function extractSentences(text, keywords, fallback) {
  const picked = splitSentences(text).filter((sentence) => keywords.some((keyword) => sentence.includes(keyword)));
  return (picked.slice(0, 3).join('。') || fallback).replace(/。+/g, '。').trim();
}

function summarizeSentences(text, keywords, fallback, max = 2) {
  const picked = splitSentences(text).filter((sentence) => keywords.some((keyword) => sentence.includes(keyword)));
  return (picked.slice(0, max).join('。') || fallback).replace(/。+/g, '。').trim();
}

function inferDueDate(text, baseDate) {
  const body = String(text || '');
  const explicit = body.match(/(20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}|\d{1,2}[\/.-]\d{1,2}|\d{1,2}日)(?:（[^）]+）)?まで/);
  if (explicit) {
    return normalizePartialDate(explicit[1], baseDate);
  }

  const deadlineLine = splitSentences(body).find((sentence) => /までに|期限|締切/.test(sentence));
  if (deadlineLine) {
    const partial = deadlineLine.match(/(20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}|\d{1,2}[\/.-]\d{1,2}|\d{1,2}日)/);
    if (partial) return normalizePartialDate(partial[1], baseDate);
  }
  return '';
}

function generateSummary({ transcript, docUrl, sampleDate }) {
  const body = String(transcript || '').trim();
  if (!body) {
    const error = new Error('文字起こし本文を入力してください。');
    error.statusCode = 400;
    throw error;
  }

  const date = normalizeDate(sampleDate || extractDate(body) || todayString());
  const company = inferCompany(body);
  const ourContact = inferContact(body, true);
  const theirContact = inferContact(body, false);
  const dueDate = inferDueDate(body, date);

  return {
    docUrl: String(docUrl || '').trim(),
    company,
    date,
    ourContact,
    theirContact,
    summary: summarizeSentences(body, ['デモ', '導入', '要件', '比較', '課題', '連携', '活用', '提案', '役員会議', '稟議'], body.slice(0, 140), 3),
    temperature: inferTemperature(body),
    decision: summarizeSentences(body, ['決定', '進める', '送付', '見積', '再提案', 'プレゼン', '正式', '役員会議', '契約'], '次回アクション中心に継続検討。', 2),
    homework: summarizeSentences(body, ['までに', '送付', '調整', '準備', '実施', '火曜中', '社内承認', '確認', '作成'], '次回までの宿題を要整理。', 3),
    dueDate,
    extractionMode: 'rule-based',
    extractionProvider: 'local-rules'
  };
}

function extractDate(text) {
  const full = String(text || '').match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if (full) {
    return `${full[1]}/${full[2].padStart(2, '0')}/${full[3].padStart(2, '0')}`;
  }
  return '';
}

function normalizePartialDate(value, baseDate) {
  const normalized = String(value || '').replaceAll('.', '/').replaceAll('-', '/').trim();
  const full = normalized.match(/(20\d{2})\/(\d{1,2})\/(\d{1,2})/);
  if (full) return `${full[1]}/${full[2].padStart(2, '0')}/${full[3].padStart(2, '0')}`;

  const partial = normalized.match(/(\d{1,2})\/(\d{1,2})/);
  if (partial) {
    const year = String(baseDate || todayString()).slice(0, 4);
    return `${year}/${partial[1].padStart(2, '0')}/${partial[2].padStart(2, '0')}`;
  }

  const dayOnly = normalized.match(/(\d{1,2})日/);
  if (dayOnly) {
    const basis = String(baseDate || todayString()).split('/');
    return `${basis[0]}/${basis[1].padStart(2, '0')}/${dayOnly[1].padStart(2, '0')}`;
  }
  return '';
}

function countKeywords(text, keywords) {
  return keywords.reduce((count, word) => count + (String(text || '').includes(word) ? 1 : 0), 0);
}

function cleanupCompany(value) {
  return String(value || '')
    .replace(/_[^\s\n]+$/, '')
    .replace(/との.*$/, '')
    .replace(/と .*$/, '')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    dueDate: normalizeDate(input.dueDate),
    extractionMode: String(input.extractionMode || '').trim(),
    extractionProvider: String(input.extractionProvider || '').trim()
  };
}

module.exports = { generateSummary, normalizeDate, validateRecordInput, inferCompany, inferTemperature, inferContact, inferDueDate };
