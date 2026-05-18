let googleApisPromise = null;

function createSheetsSync({ env = process.env } = {}) {
  const config = {
    spreadsheetId: String(env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim(),
    sheetName: String(env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1').trim(),
    clientEmail: String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim(),
    privateKey: normalizePrivateKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    enabled: String(env.GOOGLE_SHEETS_ENABLED || '').trim() === 'true'
  };

  const ready = Boolean(
    config.enabled && config.spreadsheetId && config.clientEmail && config.privateKey
  );

  return {
    isEnabled() {
      return ready;
    },
    describe() {
      return {
        enabled: ready,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName
      };
    },
    async appendRecord(record) {
      if (!ready) {
        return { synced: false, reason: 'not-configured' };
      }

      const { google } = await loadGoogleApis();
      const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: config.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const values = [[
        record.company || '',
        record.date || '',
        record.summary || '',
        record.temperature || '',
        record.decision || '',
        record.homework || ''
      ]];

      await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: `${config.sheetName}!A:F`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });

      return {
        synced: true,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName
      };
    }
  };
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

async function loadGoogleApis() {
  if (!googleApisPromise) {
    googleApisPromise = import('googleapis');
  }
  return googleApisPromise;
}

module.exports = { createSheetsSync, normalizePrivateKey };
