const { normalizeDate } = require('./domain');

function createSummaryService({ env = process.env, fallbackGenerateSummary }) {
  if (typeof fallbackGenerateSummary !== 'function') {
    throw new Error('fallbackGenerateSummary is required');
  }

  const config = {
    apiKey: String(env.OPENAI_API_KEY || '').trim(),
    model: String(env.OPENAI_MODEL || 'gpt-4.1-mini').trim(),
    baseUrl: String(env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    timeoutMs: Number(env.OPENAI_TIMEOUT_MS || 45000)
  };

  return {
    async summarize(input) {
      const fallback = fallbackGenerateSummary(input);
      if (!config.apiKey) {
        return {
          ...fallback,
          extractionMode: 'rule-based',
          extractionProvider: 'fallback'
        };
      }

      try {
        const llmResult = await requestOpenAISummary({ input, config });
        return {
          docUrl: String(input.docUrl || '').trim(),
          company: cleanText(llmResult.company),
          date: normalizeDate(llmResult.date || input.sampleDate || '') || fallback.date,
          ourContact: cleanText(llmResult.ourContact),
          theirContact: cleanText(llmResult.theirContact),
          summary: cleanText(llmResult.summary),
          temperature: cleanText(llmResult.temperature),
          decision: cleanText(llmResult.decision),
          homework: cleanText(llmResult.homework),
          dueDate: normalizeDate(llmResult.dueDate),
          extractionMode: 'llm',
          extractionProvider: `openai:${config.model}`
        };
      } catch (error) {
        if (env.OPENAI_REQUIRED === 'true') {
          const wrapped = new Error(`LLM 抽出に失敗しました: ${error.message}`);
          wrapped.statusCode = 502;
          throw wrapped;
        }
        return {
          ...fallback,
          extractionMode: 'rule-based',
          extractionProvider: `fallback-after-error:${error.message}`
        };
      }
    }
  };
}

async function requestOpenAISummary({ input, config }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  const prompt = buildPrompt(input);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: [
              'あなたは日本語の商談文字起こしを、営業オペレーション用の構造化データへ変換するアシスタントです。',
              '必ず JSON object のみを返してください。コードブロックは禁止です。',
              '値が不明なら空文字を入れてください。推測しすぎないでください。',
              'date と dueDate は YYYY/MM/DD 形式、temperature は短い日本語ラベルにしてください。'
            ].join('\n')
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const bodyText = await response.text();
    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      throw new Error(body?.error?.message || body?.message || `OpenAI API error (${response.status})`);
    }

    const text = body?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI response content was empty');
    }

    return normalizeSummaryPayload(parseJsonObject(text));
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('OpenAI API timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(input) {
  return [
    '以下の商談文字起こしを読み、次の JSON を返してください。',
    '{',
    '  "company": "",',
    '  "date": "",',
    '  "ourContact": "",',
    '  "theirContact": "",',
    '  "summary": "",',
    '  "temperature": "",',
    '  "decision": "",',
    '  "homework": "",',
    '  "dueDate": ""',
    '}',
    '',
    '出力ルール:',
    '- summary は 80〜180 文字程度の日本語',
    '- temperature は「高い / 前向き」「中 / 検討中」「低い / 保留」など短い表現',
    '- decision は今回決まったことだけ',
    '- homework は次回までの宿題・アクションを簡潔にまとめる',
    '- dueDate は明確な期限がある場合のみ',
    '- 不明な項目は空文字',
    '',
    `参考日付: ${String(input.sampleDate || '').trim() || 'なし'}`,
    `参考Doc URL: ${String(input.docUrl || '').trim() || 'なし'}`,
    '',
    '文字起こし:',
    String(input.transcript || '').trim()
  ].join('\n');
}

function parseJsonObject(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('LLM returned non-JSON content');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function normalizeSummaryPayload(payload) {
  return {
    company: cleanText(payload.company),
    date: normalizeDate(payload.date),
    ourContact: cleanText(payload.ourContact),
    theirContact: cleanText(payload.theirContact),
    summary: cleanText(payload.summary),
    temperature: cleanText(payload.temperature),
    decision: cleanText(payload.decision),
    homework: cleanText(payload.homework),
    dueDate: normalizeDate(payload.dueDate)
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

module.exports = { createSummaryService, parseJsonObject, normalizeSummaryPayload };
