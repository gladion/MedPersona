const fs = require('fs');
const path = require('path');
const { readJson, writeJson, DATA_DIR } = require('./store');
const { parseCasesFromCsv } = require('./csvImport');

const SEED_CSV_PATH = path.join(DATA_DIR, 'seed-source.csv');

function ensureDataFiles() {
  // Admin account
  readJson('admin', { username: 'admin', password: '1234', name: 'Administrator' });

  // Doctors list - seeded with one example account so the app is usable
  // immediately; the admin can add/remove doctors from the Admin panel.
  readJson('doctors', [
    {
      id: 'doc-demo-001',
      username: 'doctor',
      name: 'Dr. Sample Reviewer',
      password: '1234',
      createdAt: new Date().toISOString()
    }
  ]);

  // Per-doctor review status + questionnaire answers, keyed by
  // "<doctorId>__<sessionId>"
  readJson('responses', {});

  // Cases (virtual patients + their sessions), imported from the seed CSV
  // on first boot only. Re-imports are triggered explicitly by the admin
  // via the CSV upload feature (which overwrites this file).
  const casesPath = path.join(DATA_DIR, 'cases.json');
  if (!fs.existsSync(casesPath)) {
    if (fs.existsSync(SEED_CSV_PATH)) {
      const csvText = fs.readFileSync(SEED_CSV_PATH, 'utf-8');
      const cases = parseCasesFromCsv(csvText);
      writeJson('cases', cases);
      console.log(`Seeded ${cases.length} cases from seed-source.csv`);
    } else {
      writeJson('cases', []);
      console.log('No seed CSV found - starting with an empty case list. Use the Admin panel to upload one.');
    }
  }
}

module.exports = { ensureDataFiles };
