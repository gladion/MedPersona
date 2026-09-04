const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson, update } = require('../lib/store');
const { authenticate, requireAdmin } = require('../lib/auth');
const { computeStatus } = require('../lib/status');
const { parseCasesFromCsv } = require('../lib/csvImport');
const { QUESTIONNAIRES } = require('../lib/questionnaires');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticate, requireAdmin);

// ---------- Doctor management ----------

router.get('/doctors', (req, res) => {
  const doctors = readJson('doctors', []);
  res.json({ doctors: doctors.map((d) => ({ id: d.id, username: d.username, name: d.name, createdAt: d.createdAt })) });
});

router.post('/doctors', async (req, res) => {
  const { name, username } = req.body || {};
  if (!name || !username) return res.status(400).json({ error: 'Name and username are required' });
  const uname = String(username).trim().toLowerCase();
  if (uname === 'admin') return res.status(400).json({ error: '"admin" is a reserved username' });

  try {
    const doctors = await update('doctors', [], (list) => {
      if (list.some((d) => d.username.toLowerCase() === uname)) {
        throw new HttpError(409, 'A doctor with this username already exists');
      }
      list.push({
        id: uuidv4(),
        username: String(username).trim(),
        name: String(name).trim(),
        password: '1234',
        createdAt: new Date().toISOString()
      });
      return list;
    });
    res.status(201).json({ doctors: doctors.map((d) => ({ id: d.id, username: d.username, name: d.name })) });
  } catch (e) {
    handleErr(e, res);
  }
});

router.put('/doctors/:id', async (req, res) => {
  const { name, username } = req.body || {};
  try {
    const doctors = await update('doctors', [], (list) => {
      const idx = list.findIndex((d) => d.id === req.params.id);
      if (idx === -1) throw new HttpError(404, 'Doctor not found');
      if (username) {
        const uname = String(username).trim().toLowerCase();
        if (uname === 'admin') throw new HttpError(400, '"admin" is a reserved username');
        if (list.some((d, i) => i !== idx && d.username.toLowerCase() === uname)) {
          throw new HttpError(409, 'A doctor with this username already exists');
        }
        list[idx].username = String(username).trim();
      }
      if (name) list[idx].name = String(name).trim();
      return list;
    });
    res.json({ doctors: doctors.map((d) => ({ id: d.id, username: d.username, name: d.name })) });
  } catch (e) {
    handleErr(e, res);
  }
});

router.delete('/doctors/:id', async (req, res) => {
  try {
    const doctors = await update('doctors', [], (list) => {
      const next = list.filter((d) => d.id !== req.params.id);
      if (next.length === list.length) throw new HttpError(404, 'Doctor not found');
      return next;
    });
    res.json({ doctors: doctors.map((d) => ({ id: d.id, username: d.username, name: d.name })) });
  } catch (e) {
    handleErr(e, res);
  }
});

// ---------- CSV import ----------

router.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
  try {
    const csvText = req.file.buffer.toString('utf-8');
    const cases = parseCasesFromCsv(csvText);
    if (cases.length === 0) {
      return res.status(400).json({ error: 'No valid cases found in the uploaded file' });
    }
    writeJson('cases', cases);
    const sessionCount = cases.reduce((sum, c) => sum + c.sessions.length, 0);
    res.json({ ok: true, caseCount: cases.length, sessionCount });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Could not parse this CSV file. Please check its format.' });
  }
});

// ---------- Stats ----------

router.get('/stats', (req, res) => {
  const cases = readJson('cases', []);
  const doctors = readJson('doctors', []);
  const responses = readJson('responses', {});

  const totalSessions = cases.reduce((sum, c) => sum + c.sessions.length, 0);

  const perDoctor = doctors.map((d) => {
    const counts = { green: 0, yellow: 0, black: 0 };
    for (const c of cases) {
      for (const s of c.sessions) {
        const rec = responses[`${d.id}__${s.id}`];
        counts[computeStatus(rec)]++;
      }
    }
    return { id: d.id, name: d.name, username: d.username, ...counts, total: totalSessions };
  });

  const totalReviews = Object.values(responses).filter((r) => r.q1 && r.q2 && r.q3).length;

  res.json({
    totals: {
      doctors: doctors.length,
      cases: cases.length,
      sessions: totalSessions,
      completedReviews: totalReviews
    },
    perDoctor
  });
});

// ---------- Data export (for research use; no student emails, ever) ----------

router.get('/export.json', (req, res) => {
  const doctors = readJson('doctors', []);
  const responses = readJson('responses', {});
  const cases = readJson('cases', []);

  const sessionIndex = {};
  for (const c of cases) {
    for (const s of c.sessions) {
      sessionIndex[s.id] = { case_uuid: c.case_uuid, case_title: c.title, session_timestamp: s.timestamp };
    }
  }
  const doctorIndex = {};
  for (const d of doctors) doctorIndex[d.id] = { name: d.name, username: d.username };

  const rows = Object.entries(responses).map(([key, rec]) => {
    const meta = sessionIndex[rec.sessionId] || {};
    const doc = doctorIndex[rec.doctorId] || { name: rec.doctorId, username: rec.doctorId };
    return {
      doctor_name: doc.name,
      doctor_username: doc.username,
      case_title: meta.case_title || null,
      case_uuid: meta.case_uuid || null,
      session_id: rec.sessionId,
      session_timestamp: meta.session_timestamp || null,
      status: computeStatus(rec),
      q1: rec.q1 || null,
      q2: rec.q2 || null,
      q3: rec.q3 || null
    };
  });

  res.setHeader('Content-Disposition', 'attachment; filename="medsim-review-export.json"');
  res.json({ exportedAt: new Date().toISOString(), records: rows });
});

router.get('/export.csv', (req, res) => {
  const doctors = readJson('doctors', []);
  const responses = readJson('responses', {});
  const cases = readJson('cases', []);

  const sessionIndex = {};
  for (const c of cases) {
    for (const s of c.sessions) {
      sessionIndex[s.id] = { case_uuid: c.case_uuid, case_title: c.title, session_timestamp: s.timestamp };
    }
  }
  const doctorIndex = {};
  for (const d of doctors) doctorIndex[d.id] = { name: d.name, username: d.username };

  const headers = [
    'doctor_name', 'doctor_username', 'case_title', 'case_uuid', 'session_id',
    'session_timestamp', 'status',
    ...QUESTIONNAIRES.q1.items.map((it) => `q1_${it.id}`), 'q1_issues',
    ...QUESTIONNAIRES.q2.items.map((it) => `q2_${it.id}`),
    ...QUESTIONNAIRES.q3.items.map((it) => `q3_${it.id}`)
  ];

  const lines = [headers.join(',')];
  for (const rec of Object.values(responses)) {
    const meta = sessionIndex[rec.sessionId] || {};
    const doc = doctorIndex[rec.doctorId] || { name: rec.doctorId, username: rec.doctorId };
    const row = [
      doc.name, doc.username, meta.case_title || '', meta.case_uuid || '', rec.sessionId,
      meta.session_timestamp || '', computeStatus(rec),
      ...QUESTIONNAIRES.q1.items.map((it) => (rec.q1 && rec.q1.answers ? rec.q1.answers[it.id] : '') || ''),
      (rec.q1 && rec.q1.answers ? rec.q1.answers.issues : '') || '',
      ...QUESTIONNAIRES.q2.items.map((it) => (rec.q2 && rec.q2.answers ? rec.q2.answers[it.id] : '') || ''),
      ...QUESTIONNAIRES.q3.items.map((it) => (rec.q3 && rec.q3.answers ? rec.q3.answers[it.id] : '') || '')
    ].map(csvEscape);
    lines.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="medsim-review-export.csv"');
  res.send(lines.join('\n'));
});

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function handleErr(e, res) {
  if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
  console.error(e);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = router;
