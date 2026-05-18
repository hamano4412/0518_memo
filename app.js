const LOGIN_ID = 'demo';
const LOGIN_PASSWORD = 'demo1234';

const samples = {
  saas: {
    docUrl: 'https://docs.google.com/document/d/1GLCcAvey4jNjmX0ZCvgIIR-u8mPBsY8DaVtBx23rby0/edit',
    date: '2026-05-15',
    transcript: `商談文字起こし：株式会社A様_SaaS導入検討MTG（ダミー）\n田中：前回、概算の資料をお送りして、今日は実際に現場の方が使うデモ画面をお見せしながら、細かい操作感を確認できればなと。\n佐藤：現場の人間ってITにあまり強くないので、直感的に使いこなせるかどうかが一番の懸念点です。\n田中：専用アプリも提供していますし、ブラウザからも最適化された画面で使えます。\n佐藤：前回の商談で触れたAPI連携の件ですが、Slackに通知飛ばす設定ってエンジニアがいなくてもできますか。\n田中：管理画面からWebhookのURLを入れるだけなので、ノーコードでいけます。後ほどその手順書も送ります。\n佐藤：内容的には非常に良いと思います。来月の役員会議にかけて正式に決定したいので、20日までに最終的な見積書をPDFでいただけますか。\n田中：来週月曜までには正式な見積書をメールでお送りします。\n田中：5/18（月）までに見積書PDFを送付。Slack連携の簡易マニュアルを添付。\n佐藤様：5/20（水）までに社内承認プロセスへ。`
  },
  erp: {
    docUrl: 'https://docs.google.com/document/d/16OZ0Ty3T-bg45F_P81chAwu0DnDOb_ypBfFECztOEk4/edit',
    date: '2026-05-15',
    transcript: `商談：グローバル基幹システム（ERP）刷新に向けた要件定義ヒアリング\n高橋：前回提示した全面クラウド移行とハイブリッド構成の比較検討について、各部署のフィードバックをいただけますでしょうか。\n山下：経営層はコスト削減よりスピード重視。ただ、タイの現地法人が独自システムを使っていて統合が必須条件です。\n河野：タイのシステムは古いOracleで、APIが公開されていません。\n高橋：その場合、初期構築費用に約800万円上乗せになります。\n千葉：マルチ通貨対応のオプションは入っていましたっけ。\n高橋：プランAには含まれていますが、プランBだとグローバル拡張パックが必要です。\n山下：国内は10月にフル稼働、タイ拠点は来年4月移行、移行まではCSVインポート対応なら開発費800万は浮きますよね。\n高橋：CSVフォーマット変換ツールとして別途150万円の導入を推奨しますが、来月までの契約なら無償提供できます。\n河野：情シスのリソースが9月は埋まっていて、最短でも12月、現実的には来年1月スタートです。\n千葉：やるなら11月か、いっそ来年の5月です。\n高橋：11月稼働開始をターゲットに、タイ拠点は段階的移行、API開発を再度見積もるということでよろしいでしょうか。\n山下：複雑なパターンを全部網羅した再提案書、来週の木曜までに作れる？火曜中に河野君に送っておいて。`
  }
};

const initialRows = [
  {
    company: '株式会社A様', ourContact: '田中', theirContact: '佐藤', date: '2026/05/15',
    summary: 'SaaS導入検討MTG。現場向けデモ、UIの使いやすさ、スマホ利用、Slack通知のAPI連携可否を確認。',
    temperature: '高い / 前向き',
    decision: '役員会議に向けて最終見積書PDFを受領する前提で正式検討を進める。',
    homework: '田中側は見積書PDFとSlack連携マニュアルを送付。佐藤様側は社内承認プロセスへ付議。',
    dueDate: ''
  },
  {
    company: '', ourContact: '高橋', theirContact: '山下', date: '2026/05/15',
    summary: 'ERP刷新の要件定義ヒアリング。タイ拠点連携、API未公開、為替評価、監査、稼働時期の制約を整理。',
    temperature: '中〜高 / 検討前向き',
    decision: '11月稼働を軸に、API再見積を含む再提案へ。',
    homework: '高橋側で再提案書を作成し、火曜中に河野へ送付。',
    dueDate: '2026/05/17'
  },
  {
    company: 'サンプル商事', ourContact: '阿部', theirContact: '鈴木', date: '2026/05/10',
    summary: '概算提案後のフォロー商談。社内稟議向け追加資料の要否を確認。',
    temperature: '高い / 関心あり',
    decision: '追加資料送付後に最終判断。',
    homework: 'サービス比較表を送付。',
    dueDate: '2026/05/14'
  }
];

let rows = [...initialRows];
let pendingResult = null;

const els = {
  loginScreen: document.getElementById('loginScreen'),
  appRoot: document.getElementById('appRoot'),
  loginId: document.getElementById('loginId'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  navInput: document.getElementById('navInput'),
  navHistory: document.getElementById('navHistory'),
  screenInput: document.getElementById('screenInput'),
  screenHistory: document.getElementById('screenHistory'),
  stepPaste: document.getElementById('stepPaste'),
  stepConfirm: document.getElementById('stepConfirm'),
  stepDone: document.getElementById('stepDone'),
  statusBadge: document.getElementById('statusBadge'),
  docUrl: document.getElementById('docUrl'),
  transcript: document.getElementById('transcript'),
  generateBtn: document.getElementById('generateBtn'),
  backToPasteBtn: document.getElementById('backToPasteBtn'),
  confirmBtn: document.getElementById('confirmBtn'),
  newEntryBtn: document.getElementById('newEntryBtn'),
  goHistoryBtn: document.getElementById('goHistoryBtn'),
  confirmCompany: document.getElementById('confirmCompany'),
  confirmDate: document.getElementById('confirmDate'),
  confirmOurContact: document.getElementById('confirmOurContact'),
  confirmTheirContact: document.getElementById('confirmTheirContact'),
  confirmSummary: document.getElementById('confirmSummary'),
  confirmDecision: document.getElementById('confirmDecision'),
  confirmHomework: document.getElementById('confirmHomework'),
  confirmDueDate: document.getElementById('confirmDueDate'),
  doneMessage: document.getElementById('doneMessage'),
  rowCount: document.getElementById('rowCount'),
  statTotal: document.getElementById('statTotal'),
  statTodayDue: document.getElementById('statTodayDue'),
  statOverdue: document.getElementById('statOverdue'),
  statNoDue: document.getElementById('statNoDue'),
  sheetRows: document.getElementById('sheetRows')
};

function normalizeDate(value) {
  if (!value) return '';
  return value.replaceAll('-', '/');
}
function toDateInput(value) {
  if (!value || value === '—') return '';
  return value.replaceAll('/', '-');
}
function todayString() {
  return normalizeDate(new Date().toISOString().slice(0, 10));
}
function inferTemperature(text) {
  const highWords = ['正式', '非常に良い', '決まり', '前向き', '役員会議', 'デモ実施'];
  const midWords = ['検討', '再提案', '課題', '懸念'];
  const score = highWords.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  const mid = midWords.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  if (score >= 2) return '高い / 前向き';
  if (score >= 1) return '高い / 関心あり';
  if (mid >= 2) return '中〜高 / 検討前向き';
  return '中 / 情報収集中';
}
function extractSentences(text, keywords, fallback) {
  const sentences = text.split(/[。\n]/).map(s => s.trim()).filter(Boolean);
  const picked = sentences.filter(s => keywords.some(k => s.includes(k)));
  return (picked.slice(0, 3).join('。') || fallback).replace(/。+/g, '。');
}
function inferCompany(text) {
  const patterns = ['株式会社A様', 'NSSOL'];
  return patterns.find(p => text.includes(p)) || '';
}
function inferContact(text, ours) {
  const names = Array.from(new Set([...text.matchAll(/([一-龠ぁ-んァ-ヶA-Za-z ]{1,30})：/g)].map(m => m[1].trim())));
  if (!names.length) return '';
  return ours ? names[0] : (names[1] || '');
}
function getDueStatus(row) {
  const due = row.dueDate || '';
  const today = todayString();
  if (!due) return 'missing';
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'normal';
}
function statusClass(status) {
  if (status === 'missing') return 'row-missing';
  if (status === 'today') return 'row-today';
  if (status === 'overdue') return 'row-overdue';
  return '';
}
function buildSummary() {
  const transcript = els.transcript.value.trim();
  if (!transcript) {
    alert('文字起こし本文を入力してください。');
    return null;
  }
  const dateInput = els.docUrl.dataset.sampleDate || '';
  const date = normalizeDate(dateInput) || todayString();
  return {
    company: inferCompany(transcript),
    ourContact: inferContact(transcript, true),
    theirContact: inferContact(transcript, false),
    date,
    summary: extractSentences(transcript, ['デモ', '導入', '要件', '比較', '課題', '連携', '活用', '提案'], transcript.slice(0, 120)),
    temperature: inferTemperature(transcript),
    decision: extractSentences(transcript, ['決定', '進める', '送付', '見積', '再提案', 'デモ実施', 'プレゼン'], '次回アクション中心に継続検討。'),
    homework: extractSentences(transcript, ['までに', '送付', '調整', '準備', '実施', '火曜中', '社内承認'], '次回までの宿題を要整理。'),
    dueDate: ''
  };
}
function showScreen(name) {
  const inputActive = name === 'input';
  els.screenInput.classList.toggle('hidden', !inputActive);
  els.screenInput.classList.toggle('active', inputActive);
  els.screenHistory.classList.toggle('hidden', inputActive);
  els.screenHistory.classList.toggle('active', !inputActive);
  els.navInput.classList.toggle('active', inputActive);
  els.navHistory.classList.toggle('active', !inputActive);
}
function showStep(name) {
  ['stepPaste', 'stepConfirm', 'stepDone'].forEach(id => {
    const active = id === name;
    els[id].classList.toggle('hidden', !active);
    els[id].classList.toggle('active', active);
  });
}
function fillConfirmForm(data) {
  els.confirmCompany.value = data.company || '';
  els.confirmDate.value = toDateInput(data.date);
  els.confirmOurContact.value = data.ourContact || '';
  els.confirmTheirContact.value = data.theirContact || '';
  els.confirmSummary.value = data.summary || '';
  els.confirmDecision.value = data.decision || '';
  els.confirmHomework.value = data.homework || '';
  els.confirmDueDate.value = toDateInput(data.dueDate || '');
}
function collectConfirmForm() {
  return {
    company: els.confirmCompany.value.trim(),
    ourContact: els.confirmOurContact.value.trim(),
    theirContact: els.confirmTheirContact.value.trim(),
    date: normalizeDate(els.confirmDate.value) || '—',
    summary: els.confirmSummary.value.trim(),
    decision: els.confirmDecision.value.trim(),
    homework: els.confirmHomework.value.trim(),
    dueDate: normalizeDate(els.confirmDueDate.value)
  };
}
function renderTable() {
  els.sheetRows.innerHTML = rows.map((row, index) => {
    const dueStatus = getDueStatus(row);
    return `
      <tr class="${statusClass(dueStatus)}">
        <td>${escapeHtml(row.company)}</td>
        <td>${escapeHtml(row.ourContact)}</td>
        <td>${escapeHtml(row.theirContact)}</td>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.summary)}</td>
        <td>${escapeHtml(row.decision)}</td>
        <td>${escapeHtml(row.homework)}</td>
        <td>
          <input
            type="date"
            class="due-date-input"
            data-row-index="${index}"
            value="${toDateInput(row.dueDate || '')}"
          />
        </td>
      </tr>`;
  }).join('');

  document.querySelectorAll('.due-date-input').forEach((input) => {
    input.addEventListener('change', (event) => {
      const idx = Number(event.target.dataset.rowIndex);
      rows[idx].dueDate = normalizeDate(event.target.value);
      renderTable();
    });
  });

  const today = todayString();
  const missing = rows.filter(r => !r.dueDate).length;
  const dueToday = rows.filter(r => r.dueDate === today).length;
  const overdue = rows.filter(r => r.dueDate && r.dueDate < today).length;
  els.rowCount.textContent = `${rows.length}件`;
  els.statTotal.textContent = String(rows.length);
  els.statTodayDue.textContent = String(dueToday);
  els.statOverdue.textContent = String(overdue);
  els.statNoDue.textContent = String(missing);
}
function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function resetEntryFlow() {
  pendingResult = null;
  els.statusBadge.textContent = '入力待ち';
  els.statusBadge.className = 'status';
  showStep('stepPaste');
  showScreen('input');
}
function loadSample(key) {
  const sample = samples[key];
  if (!sample) return;
  els.docUrl.value = sample.docUrl;
  els.docUrl.dataset.sampleDate = sample.date;
  els.transcript.value = sample.transcript;
  resetEntryFlow();
}
function doLogin() {
  const ok = els.loginId.value.trim() === LOGIN_ID && els.loginPassword.value === LOGIN_PASSWORD;
  els.loginError.classList.toggle('hidden', ok);
  if (!ok) return;
  els.loginScreen.classList.add('hidden');
  els.appRoot.classList.remove('hidden');
}

els.loginBtn.addEventListener('click', doLogin);
els.loginPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
els.generateBtn.addEventListener('click', () => {
  const result = buildSummary();
  if (!result) return;
  pendingResult = result;
  fillConfirmForm(result);
  els.statusBadge.textContent = '確認待ち';
  els.statusBadge.className = 'status warn';
  showStep('stepConfirm');
});
els.backToPasteBtn.addEventListener('click', () => {
  showStep('stepPaste');
  els.statusBadge.textContent = '入力待ち';
  els.statusBadge.className = 'status';
});
els.confirmBtn.addEventListener('click', () => {
  const finalRow = collectConfirmForm();
  rows = [finalRow, ...rows];
  renderTable();
  els.doneMessage.textContent = `${finalRow.company || '未設定の会社'} の内容を反映しました。商談履歴画面でも確認できます。`;
  els.statusBadge.textContent = '反映済み';
  els.statusBadge.className = 'status ready';
  showStep('stepDone');
});
els.newEntryBtn.addEventListener('click', () => {
  els.transcript.value = '';
  els.docUrl.value = '';
  els.docUrl.dataset.sampleDate = '';
  resetEntryFlow();
});
els.goHistoryBtn.addEventListener('click', () => showScreen('history'));
els.navInput.addEventListener('click', () => showScreen('input'));
els.navHistory.addEventListener('click', () => showScreen('history'));
document.querySelectorAll('[data-sample]').forEach(btn => btn.addEventListener('click', () => loadSample(btn.dataset.sample)));

renderTable();
loadSample('saas');