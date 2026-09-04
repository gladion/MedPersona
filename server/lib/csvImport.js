const { parse } = require('csv-parse/sync');

/**
 * Parses the raw simulation-export CSV (as produced by the MedSim platform)
 * into an array of "cases", each holding its virtual-patient sessions.
 *
 * Student emails are intentionally dropped here and never stored anywhere
 * downstream - they must never be shown or exported.
 *
 * Expected CSV columns:
 * id, user_id, messages, diagnosis, timestamp, title, review, score,
 * chat_duration, tests_asked, requested_tests, hints_used, case_uuid, email
 */
function parseCasesFromCsv(csvText) {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });

  const caseMap = new Map();

  for (const row of records) {
    const caseUuid = (row.case_uuid || '').trim();
    if (!caseUuid) continue;

    if (!caseMap.has(caseUuid)) {
      caseMap.set(caseUuid, {
        case_uuid: caseUuid,
        title: (row.title || 'Untitled Case').trim(),
        correct_diagnosis: safeParseReview(row.review)?.review?.correct_diagnosis || row.diagnosis || '',
        sessions: []
      });
    }

    let messages = [];
    try {
      messages = JSON.parse(row.messages || '[]');
    } catch (e) {
      messages = [];
    }

    let review = null;
    const parsedReview = safeParseReview(row.review);
    if (parsedReview && parsedReview.review) {
      review = parsedReview.review;
    }

    const session = {
      id: row.id,
      // user_id is an internal, non-identifying student token - kept for
      // de-duplication only. email is deliberately NOT stored.
      user_id: row.user_id || null,
      title: (row.title || 'Untitled Case').trim(),
      case_uuid: caseUuid,
      diagnosis: row.diagnosis || '',
      timestamp: row.timestamp || null,
      messages,
      review,
      score: numOrNull(row.score),
      chat_duration: numOrNull(row.chat_duration),
      tests_asked: splitList(row.tests_asked),
      requested_tests: splitList(row.requested_tests),
      hints_used: numOrNull(row.hints_used)
    };

    caseMap.get(caseUuid).sessions.push(session);
  }

  // Sort sessions within each case by timestamp (oldest first)
  for (const c of caseMap.values()) {
    c.sessions.sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
      const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
      return ta - tb;
    });
  }

  return Array.from(caseMap.values());
}

function safeParseReview(reviewRaw) {
  if (!reviewRaw) return null;
  try {
    return JSON.parse(reviewRaw);
  } catch (e) {
    return null;
  }
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function splitList(v) {
  if (!v) return [];
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = { parseCasesFromCsv };
