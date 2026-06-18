const db = require('../services/sheetsDb');

async function startExam(req, res) {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ error: 'Código de acesso é obrigatório' });

  const exam = await db.findOne('Exams', e => e.accessCode === accessCode.toUpperCase().trim());
  if (!exam) return res.status(404).json({ error: 'Código inválido' });
  if (exam.status !== 'ACTIVE') return res.status(403).json({ error: 'Esta prova não está disponível no momento' });

  const existing = await db.findOne('ExamAttempts', a => a.studentId === req.user.id && a.examId === exam.id);
  if (existing && existing.status !== 'IN_PROGRESS') {
    return res.status(409).json({ error: 'Você já realizou esta prova' });
  }
  if (existing) {
    return res.json({ attempt: existing, exam: await buildSanitizedExam(exam) });
  }

  const attempt = await db.insert('ExamAttempts', {
    examId: exam.id, studentId: req.user.id,
    startedAt: new Date().toISOString(), submittedAt: '',
    score: '', maxScore: '', status: 'IN_PROGRESS', totalFocusLostSeconds: '0',
  });

  return res.status(201).json({ attempt, exam: await buildSanitizedExam(exam) });
}

async function buildSanitizedExam(exam) {
  const questions = await db.findWhere('Questions', q => q.examId === exam.id);
  questions.sort((a, b) => Number(a.order) - Number(b.order));
  const allOptions = await db.readAll('Options');

  return {
    ...exam,
    durationMinutes: Number(exam.durationMinutes),
    questions: questions.map(q => ({
      ...q,
      points: Number(q.points),
      order: Number(q.order),
      correctBlank: undefined,
      options: allOptions.filter(o => o.questionId === q.id).map(o => ({ id: o.id, text: o.text })),
    })),
  };
}

async function saveAnswer(req, res) {
  const { questionId, selectedOptionId, textAnswer } = req.body;

  const attempt = await db.findOne('ExamAttempts', a => a.id === req.params.id && a.studentId === req.user.id && a.status === 'IN_PROGRESS');
  if (!attempt) return res.status(404).json({ error: 'Tentativa não encontrada ou já encerrada' });

  const existing = await db.findOne('Answers', a => a.attemptId === attempt.id && a.questionId === questionId);

  if (existing) {
    const updated = await db.update('Answers', existing.id, {
      ...existing,
      selectedOptionId: selectedOptionId || '',
      textAnswer: textAnswer || '',
    });
    return res.json(updated);
  }

  const answer = await db.insert('Answers', {
    attemptId: attempt.id, questionId,
    selectedOptionId: selectedOptionId || '',
    textAnswer: textAnswer || '',
    isCorrect: 'false', pointsEarned: '0',
  });
  return res.json(answer);
}

async function submitExam(req, res) {
  const { totalFocusLostSeconds } = req.body;

  const attempt = await db.findOne('ExamAttempts', a => a.id === req.params.id && a.studentId === req.user.id && a.status === 'IN_PROGRESS');
  if (!attempt) return res.status(404).json({ error: 'Tentativa não encontrada ou já encerrada' });

  const questions = await db.findWhere('Questions', q => q.examId === attempt.examId);
  const allOptions = await db.readAll('Options');
  const answers = await db.findWhere('Answers', a => a.attemptId === attempt.id);

  let totalScore = 0;
  let maxScore = 0;

  for (const question of questions) {
    const pts = Number(question.points);
    maxScore += pts;
    const answer = answers.find(a => a.questionId === question.id);
    if (!answer) continue;

    let isCorrect = false;
    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      const correctOpt = allOptions.find(o => o.questionId === question.id && o.isCorrect === 'true');
      isCorrect = answer.selectedOptionId === correctOpt?.id;
    } else if (question.type === 'FILL_BLANK') {
      const studentAns = (answer.textAnswer || '').trim().toLowerCase();
      const correct = (question.correctBlank || '').trim().toLowerCase();
      isCorrect = studentAns === correct;
    }

    const pointsEarned = isCorrect ? pts : 0;
    totalScore += pointsEarned;
    await db.update('Answers', answer.id, { ...answer, isCorrect: String(isCorrect), pointsEarned: String(pointsEarned) });
  }

  const updated = await db.update('ExamAttempts', attempt.id, {
    ...attempt,
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    score: String(totalScore),
    maxScore: String(maxScore),
    totalFocusLostSeconds: String(totalFocusLostSeconds || 0),
  });

  return res.json({
    score: totalScore, maxScore,
    percentage: maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : 0,
    attempt: updated,
  });
}

async function logViolation(req, res) {
  const { type, details, durationSeconds } = req.body;

  const attempt = await db.findOne('ExamAttempts', a => a.id === req.params.id && a.studentId === req.user.id && a.status === 'IN_PROGRESS');
  if (!attempt) return res.status(404).json({ error: 'Tentativa não encontrada' });

  const violation = await db.insert('ViolationLogs', {
    attemptId: attempt.id, type, details: details || '',
    timestamp: new Date().toISOString(),
    durationSeconds: String(durationSeconds || 0),
  });
  return res.status(201).json(violation);
}

async function getMyAttempts(req, res) {
  const attempts = await db.findWhere('ExamAttempts', a => a.studentId === req.user.id && a.status !== 'IN_PROGRESS');
  const exams = await db.readAll('Exams');

  const result = attempts.map(a => {
    const exam = exams.find(e => e.id === a.examId);
    return {
      ...a,
      score: a.score !== '' ? Number(a.score) : null,
      maxScore: a.maxScore !== '' ? Number(a.maxScore) : null,
      totalFocusLostSeconds: Number(a.totalFocusLostSeconds) || 0,
      exam: exam ? { title: exam.title, durationMinutes: Number(exam.durationMinutes) } : null,
    };
  }).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  return res.json(result);
}

async function getAttemptDetail(req, res) {
  const attempt = await db.findOne('ExamAttempts', a => a.id === req.params.id && a.studentId === req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Tentativa não encontrada' });

  const exam = await db.findById('Exams', attempt.examId);
  const violations = await db.findWhere('ViolationLogs', v => v.attemptId === attempt.id);
  const answers = await db.findWhere('Answers', a => a.attemptId === attempt.id);
  const questions = await db.readAll('Questions');
  const options = await db.readAll('Options');

  const enrichedAnswers = answers.map(a => {
    const q = questions.find(q => q.id === a.questionId);
    const opt = options.find(o => o.id === a.selectedOptionId);
    return {
      ...a,
      isCorrect: a.isCorrect === 'true',
      pointsEarned: Number(a.pointsEarned),
      question: q ? { ...q, points: Number(q.points) } : null,
      selectedOption: opt || null,
    };
  });

  return res.json({
    ...attempt,
    score: attempt.score !== '' ? Number(attempt.score) : null,
    maxScore: attempt.maxScore !== '' ? Number(attempt.maxScore) : null,
    totalFocusLostSeconds: Number(attempt.totalFocusLostSeconds) || 0,
    exam: exam ? { title: exam.title } : null,
    violations: violations.map(v => ({ ...v, durationSeconds: Number(v.durationSeconds) || 0 })),
    answers: enrichedAnswers,
  });
}

async function getAttemptExam(req, res) {
  const attempt = await db.findOne('ExamAttempts', a => a.id === req.params.id && a.studentId === req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Tentativa não encontrada' });
  if (attempt.status !== 'IN_PROGRESS') return res.status(403).json({ error: 'Esta tentativa já foi encerrada' });

  const exam = await db.findById('Exams', attempt.examId);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const savedAnswers = {};
  const answers = await db.findWhere('Answers', a => a.attemptId === attempt.id);
  answers.forEach(a => {
    savedAnswers[a.questionId] = a.selectedOptionId || a.textAnswer || '';
  });

  return res.json({
    exam: await buildSanitizedExam(exam),
    savedAnswers,
    startedAt: attempt.startedAt,
  });
}

module.exports = { startExam, saveAnswer, submitExam, logViolation, getMyAttempts, getAttemptDetail, getAttemptExam };
