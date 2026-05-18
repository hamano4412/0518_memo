let rows = [];
let samples = [];
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
  confirmMeta: document.getElementById('confirmMeta'),
  doneMessage: document.getElementById('doneMessage'),
  rowCount: document.getElementById('rowCount'),
  statTotal: document.getElementById('statTotal'),
  statTodayDue: document.getElementById('statTodayDue'),
  statOverdue: document.getElementById('statOverdue'),
  statNoDue: document.getElementById('statNoDue'),
  sheetRows: document.getElementById('sheetRows'),
  sampleButtons: document.querySelector('.sample-buttons')
};

function normalizeDate(value) {
  if (!value) return '';
  return String(value).replaceAll('-', '/');
}

function toDateInput(value) {
  if (!value || value === '—') return '';
  return String(value).replaceAll('/', '-');
}

function todayString() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
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
  ['stepPaste', 'stepConfirm', 'stepDone'].forEach((id) => {
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
  els.confirmMeta.textContent = formatExtractionMeta(data);
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
    dueDate: normalizeDate(els.confirmDueDate.value),
    extractionMode: pendingResult?.extractionMode || 'rule-based',
    extractionProvider: pendingResult?.extractionProvider || 'local-rules'
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatExtractionMeta() {
  return '抽出方式: ルールベース（要確認）';
}

function buildDoneMessage(created) {
  const company = created.company || '未設定の会社';
  return `${company} の内容を反映しました。商談履歴画面でも確認できます。`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    throw new Error(body?.error || '通信に失敗しました。');
  }
  return body;
}

function renderSampleButtons() {
  els.sampleButtons.innerHTML = samples.map((sample) => (
    `<button data-sample="${sample.key}">${escapeHtml(sample.label)}</button>`
  )).join('');

  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', () => loadSample(button.dataset.sample));
  });
}

function loadSample(key) {
  const sample = samples.find((item) => item.key === key);
  if (!sample) return;
  els.transcript.dataset.sampleDate = sample.date;
  els.transcript.value = sample.transcript;
  resetEntryFlow();
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
    input.addEventListener('change', async (event) => {
      const idx = Number(event.target.dataset.rowIndex);
      const row = rows[idx];
      try {
        const updated = await requestJson(`/api/records/${row.id}/due-date`, {
          method: 'PATCH',
          body: JSON.stringify({ dueDate: normalizeDate(event.target.value) })
        });
        rows[idx] = updated;
        renderTable();
      } catch (error) {
        alert(error.message);
        event.target.value = toDateInput(row.dueDate || '');
      }
    });
  });

  const today = todayString();
  const missing = rows.filter((row) => !row.dueDate).length;
  const dueToday = rows.filter((row) => row.dueDate === today).length;
  const overdue = rows.filter((row) => row.dueDate && row.dueDate < today).length;
  els.rowCount.textContent = `${rows.length}件`;
  els.statTotal.textContent = String(rows.length);
  els.statTodayDue.textContent = String(dueToday);
  els.statOverdue.textContent = String(overdue);
  els.statNoDue.textContent = String(missing);
}

function resetEntryFlow() {
  pendingResult = null;
  els.statusBadge.textContent = '入力待ち';
  els.statusBadge.className = 'status';
  showStep('stepPaste');
  showScreen('input');
}

async function bootstrap() {
  const payload = await requestJson('/api/bootstrap', { headers: {} });
  samples = payload.samples;
  rows = payload.records;
  renderSampleButtons();
  renderTable();
  if (samples.length > 0) {
    loadSample(samples[0].key);
  }
}

async function doLogin() {
  try {
    await requestJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        loginId: els.loginId.value.trim(),
        password: els.loginPassword.value
      })
    });
    els.loginError.classList.add('hidden');
    els.loginScreen.classList.add('hidden');
    els.appRoot.classList.remove('hidden');
  } catch (error) {
    els.loginError.textContent = error.message;
    els.loginError.classList.remove('hidden');
  }
}

els.loginBtn.addEventListener('click', doLogin);
els.loginPassword.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') doLogin();
});

els.generateBtn.addEventListener('click', async () => {
  try {
    const result = await requestJson('/api/summary', {
      method: 'POST',
      body: JSON.stringify({
        transcript: els.transcript.value,
        sampleDate: els.transcript.dataset.sampleDate || ''
      })
    });
    pendingResult = result;
    fillConfirmForm(result);
    els.statusBadge.textContent = '確認待ち';
    els.statusBadge.className = 'status warn';
    showStep('stepConfirm');
  } catch (error) {
    alert(error.message);
  }
});

els.backToPasteBtn.addEventListener('click', () => {
  showStep('stepPaste');
  els.statusBadge.textContent = '入力待ち';
  els.statusBadge.className = 'status';
});

els.confirmBtn.addEventListener('click', async () => {
  try {
    const created = await requestJson('/api/records', {
      method: 'POST',
      body: JSON.stringify(collectConfirmForm())
    });
    rows = [created, ...rows];
    renderTable();
    els.doneMessage.textContent = buildDoneMessage(created);
    els.statusBadge.textContent = '反映済み';
    els.statusBadge.className = 'status ready';
    showStep('stepDone');
  } catch (error) {
    alert(error.message);
  }
});

els.newEntryBtn.addEventListener('click', () => {
  els.transcript.value = '';
  els.transcript.dataset.sampleDate = '';
  resetEntryFlow();
});

els.goHistoryBtn.addEventListener('click', () => showScreen('history'));
els.navInput.addEventListener('click', () => showScreen('input'));
els.navHistory.addEventListener('click', () => showScreen('history'));

bootstrap().catch((error) => {
  console.error(error);
  alert('初期データの読込に失敗しました。');
});
