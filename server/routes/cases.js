const express = require('express');
const { readJson, update } = require('../lib/store');
const { authenticate, requireDoctor } = require('../lib/auth');
const { computeStatus, responseKey } = require('../lib/status');
const { QUESTIONNAIRES, isComplete } = require('../lib/questionnaires');

const router = express.Router();

router.use(authenticate, requireDoctor);

function currentDoctorId(req) {
  // Admins browsing the doctor views are tracked under a fixed pseudo-id so
  // they never collide with, or see, real doctors' progress.
  return req.user.role === 'admin' ? 'admin' : req.user.id;
}

// GET /api/questionnaire-defs - static definitions for the 3 forms
router.get('/questionnaire-defs', (req, res) => {
  res.json({ questionnaires: QUESTIONNAIRES });
});

// GET /api/cases - list all cases with this doctor's progress summary
router.get('/cases', (req, res) => {
  const cases = readJson('cases', []);
  const responses = readJson('responses', {});
  const doctorId = currentDoctorId(req);

  const list = cases.map((c) => {
    const counts = { green: 0, yellow: 0, black: 0 };
    for (const s of c.sessions) {
      const rec = responses[responseKey(doctorId, s.id)];
      counts[computeStatus(rec)]++;
    }
    return {
      case_uuid: c.case_uuid,
      title: c.title,
      correct_diagnosis: c.correct_diagnosis,
      sessionCount: c.sessions.length,
      progress: counts
    };
  });

  res.json({ cases: list });
});

// GET /api/cases/:caseUuid - sessions list (no full chat) with status
router.get('/cases/:caseUuid', (req, res) => {
  const cases = readJson('cases', []);
  const c = cases.find((x) => x.case_uuid === req.params.caseUuid);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const responses = readJson('responses', {});
  const doctorId = currentDoctorId(req);

  const sessions = c.sessions.map((s) => {
    const rec = responses[responseKey(doctorId, s.id)];
    return {
      id: s.id,
      timestamp: s.timestamp,
      chat_duration: s.chat_duration,
      score: s.score,
      messageCount: s.messages.length,
      status: computeStatus(rec)
    };
  });

  res.json({
    case_uuid: c.case_uuid,
    title: c.title,
    correct_diagnosis: c.correct_diagnosis,
    sessions
  });
});

// GET /api/sessions/:sessionId - full session detail for this doctor
router.get('/sessions/:sessionId', (req, res) => {
  const cases = readJson('cases', []);
  let session = null;
  let caseInfo = null;
  for (const c of cases) {
    const found = c.sessions.find((s) => s.id === req.params.sessionId);
    if (found) {
      session = found;
      caseInfo = { case_uuid: c.case_uuid, title: c.title, correct_diagnosis: c.correct_diagnosis };
      break;
    }
  }
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const responses = readJson('responses', {});
  const doctorId = currentDoctorId(req);
  const rec = responses[responseKey(doctorId, session.id)] || {};
  const status = computeStatus(rec);

  // The AI feedback (review) is only released to the doctor once both
  // Questionnaire 1 and Questionnaire 2 have been fully completed.
  const feedbackUnlocked =
    isComplete('q1', rec.q1 && rec.q1.answers) && isComplete('q2', rec.q2 && rec.q2.answers);

  res.json({
    case: caseInfo,
    session: {
      id: session.id,
      timestamp: session.timestamp,
      chat_duration: session.chat_duration,
      score: session.score,
      diagnosis: session.diagnosis,
      tests_asked: session.tests_asked,
      requested_tests: session.requested_tests,
      hints_used: session.hints_used,
      messages: session.messages
    },
    review: feedbackUnlocked ? session.review : null,
    feedbackUnlocked,
    status,
    responses: {
      q1: rec.q1 || null,
      q2: rec.q2 || null,
      q3: rec.q3 || null
    }
  });
});

// POST /api/sessions/:sessionId/responses/:qKey - save one questionnaire
router.post('/sessions/:sessionId/responses/:qKey', async (req, res) => {
  const { sessionId, qKey } = req.params;
  if (!['q1', 'q2', 'q3'].includes(qKey)) {
    return res.status(400).json({ error: 'Invalid questionnaire key' });
  }

  const cases = readJson('cases', []);
  const exists = cases.some((c) => c.sessions.some((s) => s.id === sessionId));
  if (!exists) return res.status(404).json({ error: 'Session not found' });

  const doctorId = currentDoctorId(req);
  const key = responseKey(doctorId, sessionId);

  const answers = req.body && req.body.answers ? req.body.answers : {};

  try {
    const result = await update('responses', {}, (all) => {
      const current = all[key] || {};

      if (
        qKey === 'q3' &&
        !(isComplete('q1', current.q1 && current.q1.answers) && isComplete('q2', current.q2 && current.q2.answers))
      ) {
        // Guard against Q3 being unlocked out of order.
        throw new HttpError(400, 'Questionnaires 1 and 2 must be completed before Questionnaire 3');
      }

      current[qKey] = {
        answers,
        updatedAt: new Date().toISOString()
      };
      current.doctorId = doctorId;
      current.sessionId = sessionId;
      all[key] = current;
      return all;
    });

    const rec = result[key];
    res.json({
      status: computeStatus(rec),
      responses: { q1: rec.q1 || null, q2: rec.q2 || null, q3: rec.q3 || null }
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.status).json({ error: e.message });
    }
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = router;
