const { RecordStore } = require('./store');
const { SupabaseStore } = require('./supabase-store');

function createStore(options = {}) {
  const env = options.env || process.env;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStore({
      projectUrl: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      table: env.SUPABASE_TABLE || 'meeting_records'
    });
  }

  return new RecordStore({ dataFile: options.dataFile });
}

module.exports = { createStore };
