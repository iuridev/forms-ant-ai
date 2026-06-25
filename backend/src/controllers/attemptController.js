const db = require('../services/sheetsDb');

// Shuffle determinístico baseado no attemptId para que o aluno sempre veja a mesma ordem ao retomar
function seededShuffle(arr, seed) {
  const s = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  const rand = () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

async function startExam(req, res) {
  const { accessCode, examId: examIdDirect } = req.body;

  let exam;
  if (examIdDirect) {
    exam = await db.findById('Exams', examIdDirect);
    if (!exam) return res.status(404).json({ error: 'Avaliação não encontrada' });
    // Verifica se o aluno pertence a uma turma vinculada
    const memberships = await db.findWhere('GroupMembers', m => m.studentId === req.user.id);
    const groupIds = new Set(memberships.map(m => m.groupId));
    const link = await db.findOne('ExamGroups', eg => eg.examId === exam.id && groupIds.has(eg.groupId));
    if (!link) return res.status(403).json({ error: 'Você não tem acesso a esta avaliação' });
  } else if (accessCode) {
    exam = await db.findOne('Exams', e => e.accessCode === accessCode.toUpperCase().trim());
    if (!exam) return res.status(404).json({ error: 'Código inválido' });
  } else {
    return res.status(400).json({ error: 'Código de acesso ou ID da avaliação é obrigatório' });
  }

  if (exam.status !== 'ACTIVE') return res.status(403).json({ error: 'Esta avaliação não está disponível no momento' });

  // Validação de agendamento
  const now = new Date();
  if (exam.scheduledStart && new Date(exam.scheduledStart) > now) {
    return res.status(403).json({ error: `Esta avaliação só abre em ${new Date(exam.scheduledStart).toLocaleString('pt-BR')}` });
  }
  if (exam.scheduledEnd && new Date(exam.scheduledEnd) < now) {
    return res.status(403).json({ error: 'O prazo para realizar esta avaliação já encerrou.' });
  }

  const maxAttempts = Number(exam.maxAttempts) || 1;
  const examType = exam.type || 'PROVA';

  // Se há tentativa em andamento, retorna ela
  const inProgress = await db.findOne('ExamAttempts', a =>
    a.studentId === req.user.id && a.examId === exam.id && a.status === 'IN_PROGRESS'
  );
  if (inProgress) {
    return res.json({ attempt: inProgress, exam: await buildSanitizedExam(exam, inProgress.id), attemptsUsed: null, maxAttempts, examType });
  }

  // Conta tentativas concluídas
  const submitted = await db.findWhere('ExamAttempts', a =>
    a.studentId === req.user.id && a.examId === exam.id && a.status === 'SUBMITTED'
  );
  if (submitted.length >= maxAttempts) {
    const msg = examType === 'TAREFA'
      ? `Você já utilizou todas as ${maxAttempts} tentativas desta tarefa`
      : 'Você já realizou esta prova';
    return res.status(409).json({ error: msg, attemptsUsed: submitted.length, maxAttempts });
  }

  const attempt = await db.insert('ExamAttempts', {
    examId: exam.id, studentId: req.user.id,
    startedAt: new Date().toISOString(), submittedAt: '',
    score: '', maxScore: '', status: 'IN_PROGRESS', totalFocusLostSeconds: '0',
  });

  return res.status(201).json({ attempt, exam: await buildSanitizedExam(exam, attempt.id), attemptsUsed: submitted.length + 1, maxAttempts, examType });
}

async function buildSanitizedExam(exam, attemptId = null) {
  let questions = await db.findWhere('Questions', q => q.examId === exam.id);
  questions.sort((a, b) => Number(a.order) - Number(b.order));
  const allOptions = await db.readAll('Options');

  if (attemptId) {
    questions = seededShuffle(questions, attemptId + '_q');
  }

  return {
    ...exam,
    durationMinutes: Number(exam.durationMinutes),
    questions: questions.map(q => {
      let options = allOptions.filter(o => o.questionId === q.id).map(o => ({ id: o.id, text: o.text }));
      if (attemptId && q.type === 'MULTIPLE_CHOICE') {
        options = seededShuffle(options, attemptId + '_o_' + q.id);
      }
      return {
        ...q,
        points: Number(q.points),
        order: Number(q.order),
        correctBlank: undefined,
        options,
      };
    }),
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
    } else if (question.type === 'ESSAY') {
      // Dissertativa: aguarda correção manual — não pontua automaticamente
      continue;
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
  const allAttempts = await db.findWhere('ExamAttempts', a => a.studentId === req.user.id);
  const exams = await db.readAll('Exams');

  const submitted = allAttempts.filter(a => a.status === 'SUBMITTED');

  const result = submitted.map(a => {
    const exam = exams.find(e => e.id === a.examId);
    const examType = exam?.type || 'PROVA';
    const maxAttempts = Number(exam?.maxAttempts) || 1;
    const attemptsOnExam = submitted.filter(s => s.examId === a.examId).length;
    return {
      ...a,
      score: a.score !== '' ? Number(a.score) : null,
      maxScore: a.maxScore !== '' ? Number(a.maxScore) : null,
      totalFocusLostSeconds: Number(a.totalFocusLostSeconds) || 0,
      exam: exam ? {
        title: exam.title, durationMinutes: Number(exam.durationMinutes),
        type: examType, maxAttempts, accessCode: exam.accessCode,
        attemptsUsed: attemptsOnExam, remainingAttempts: Math.max(0, maxAttempts - attemptsOnExam),
      } : null,
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

  const allAttempts = exam
    ? await db.findWhere('ExamAttempts', a => a.studentId === req.user.id && a.examId === exam.id && a.status === 'SUBMITTED')
    : [];
  const maxAttempts = Number(exam?.maxAttempts) || 1;
  const examType = exam?.type || 'PROVA';

  return res.json({
    ...attempt,
    score: attempt.score !== '' ? Number(attempt.score) : null,
    maxScore: attempt.maxScore !== '' ? Number(attempt.maxScore) : null,
    totalFocusLostSeconds: Number(attempt.totalFocusLostSeconds) || 0,
    exam: exam ? {
      title: exam.title, type: examType, maxAttempts,
      accessCode: exam.accessCode,
      attemptsUsed: allAttempts.length,
      remainingAttempts: Math.max(0, maxAttempts - allAttempts.length),
    } : null,
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
