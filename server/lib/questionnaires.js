// Static definitions of the three questionnaires doctors fill in for every
// session. Kept in one place so the API and the client always agree on the
// exact wording and keys. All content is English-only by design.

const SCALE_5 = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

const QUESTIONNAIRES = {
  q1: {
    key: 'q1',
    title: 'Questionnaire 1 - Virtual Patient',
    description:
      'Please indicate your level of agreement with the following statements regarding the virtual patient.',
    type: 'likert5',
    scale: SCALE_5,
    items: [
      { id: 'coherent', text: "The virtual patient responded coherently and consistently" },
      { id: 'appropriate', text: "The virtual patient's responses were appropriate for the conversation" },
      { id: 'realistic', text: 'The virtual patient behaved in a way that felt realistic' },
      { id: 'reflected_info', text: "The virtual patient's responses reflected the information the student provided" },
      { id: 'no_emotion', text: 'The virtual patient does not understand the emotional experience of real patients' },
      { id: 'perspective', text: "The virtual patient understands the situation from the patient's perspective" },
      { id: 'meaning', text: 'The virtual patient understands the meaning behind what was said' }
    ],
    openEnded: {
      id: 'issues',
      text: "Were there any specific issues with the virtual patient's behavior?"
    }
  },

  q2: {
    key: 'q2',
    title: 'Questionnaire 2 - The Student',
    description:
      "Rate the student's performance in the interaction on a scale of 1 to 10 across the following categories.",
    type: 'scale10',
    min: 1,
    max: 10,
    items: [
      { id: 'diagnosis_accuracy', text: 'Diagnosis accuracy' },
      { id: 'question_quality', text: 'Question Quality' },
      { id: 'clinical_reasoning', text: 'Clinical Reasoning' },
      { id: 'communication', text: 'Communication' },
      { id: 'time_management', text: 'Time management' }
    ]
  },

  q3: {
    key: 'q3',
    title: 'Questionnaire 3 - AI Feedback',
    description:
      "Please indicate your level of agreement with the following statements regarding the feedback received by the student.",
    type: 'likert5',
    scale: SCALE_5,
    items: [
      { id: 'relevant', text: "The feedback was relevant to the student's interaction with the virtual patient" },
      { id: 'helpful', text: 'The feedback provided helpful suggestions for improvement' },
      { id: 'too_general', text: 'The feedback was too general to be useful' },
      { id: 'not_reflect', text: 'The feedback did not reflect what actually happened during the interaction' },
      { id: 'missed_parts', text: "The feedback did not understand important parts of the student's and the virtual patient's interaction" },
      { id: 'reflected_key', text: "The feedback reflected the key aspects of the student's interaction with the virtual patient" }
    ]
  }
};

/** Checks whether every required item of a questionnaire has a non-empty answer. */
function isComplete(qKey, answers) {
  const def = QUESTIONNAIRES[qKey];
  if (!def || !answers) return false;
  return def.items.every((it) => {
    const v = answers[it.id];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
}

module.exports = { QUESTIONNAIRES, isComplete };
