const fs = require('node:fs/promises');
const path = require('node:path');
const { initialRecords } = require('./sample-data');

class RecordStore {
  constructor({ dataFile }) {
    this.dataFile = dataFile;
    this.records = [];
  }

  async init() {
    await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
    try {
      const raw = await fs.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(raw);
      this.records = Array.isArray(parsed.records) ? parsed.records : [];
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.records = initialRecords.map((record) => ({ ...record }));
      await this.persist();
    }
  }

  getAll() {
    return this.records.map((record) => ({ ...record }));
  }

  async create(record) {
    const next = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...record
    };
    this.records = [next, ...this.records];
    await this.persist();
    return { ...next };
  }

  async updateDueDate(id, dueDate) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) return null;
    this.records[index] = {
      ...this.records[index],
      dueDate
    };
    await this.persist();
    return { ...this.records[index] };
  }

  async persist() {
    await fs.writeFile(this.dataFile, JSON.stringify({ records: this.records }, null, 2));
  }
}

module.exports = { RecordStore };
