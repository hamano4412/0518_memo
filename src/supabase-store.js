class SupabaseStore {
  constructor({ projectUrl, serviceRoleKey, table = 'meeting_records' }) {
    this.projectUrl = projectUrl.replace(/\/$/, '');
    this.serviceRoleKey = serviceRoleKey;
    this.table = table;
  }

  async init() {}

  async getAll() {
    const records = await this.request(`/${this.table}?select=*&order=created_at.desc.nullslast,created_at.desc,id.desc`);
    return records.map(mapRecordFromRow);
  }

  async create(record) {
    const rows = await this.request(`/${this.table}`, {
      method: 'POST',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify([mapRowFromRecord(record)])
    });
    return mapRecordFromRow(rows[0]);
  }

  async updateDueDate(id, dueDate) {
    const rows = await this.request(`/${this.table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ due_date: dueDate || null })
    });
    if (!rows.length) return null;
    return mapRecordFromRow(rows[0]);
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.projectUrl}/rest/v1${path}`, {
      method: options.method || 'GET',
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body
    });

    const bodyText = await response.text();
    const body = bodyText ? JSON.parse(bodyText) : null;
    if (!response.ok) {
      throw new Error(body?.message || body?.error || 'Supabase request failed');
    }
    return body;
  }
}

function mapRecordFromRow(row) {
  return {
    id: row.id,
    company: row.company || '',
    ourContact: row.our_contact || '',
    theirContact: row.their_contact || '',
    date: normalizeDisplayDate(row.meeting_date),
    summary: row.summary || '',
    decision: row.decision || '',
    homework: row.homework || '',
    dueDate: normalizeDisplayDate(row.due_date)
  };
}

function mapRowFromRecord(record) {
  return {
    company: record.company || '',
    our_contact: record.ourContact || '',
    their_contact: record.theirContact || '',
    meeting_date: normalizeNullableDate(record.date),
    summary: record.summary || '',
    decision: record.decision || '',
    homework: record.homework || '',
    due_date: normalizeNullableDate(record.dueDate)
  };
}

function normalizeNullableDate(value) {
  if (!value || value === '—') return null;
  return String(value).replaceAll('/', '-');
}

function normalizeDisplayDate(value) {
  if (!value) return '';
  return String(value).replaceAll('-', '/');
}

module.exports = { SupabaseStore, mapRecordFromRow };
