// Status meanings (matches the colored checkmarks in the UI):
//   'black'  - not handled yet (no questionnaire started)
//   'yellow' - in review (Q1 and/or Q2 started/saved, not yet complete)
//   'green'  - handled (Q1, Q2 and Q3 all submitted)
function computeStatus(record) {
  if (!record) return 'black';
  const hasQ1 = !!record.q1;
  const hasQ2 = !!record.q2;
  const hasQ3 = !!record.q3;
  if (hasQ1 && hasQ2 && hasQ3) return 'green';
  if (hasQ1 || hasQ2 || hasQ3) return 'yellow';
  return 'black';
}

function responseKey(doctorId, sessionId) {
  return `${doctorId}__${sessionId}`;
}

module.exports = { computeStatus, responseKey };
