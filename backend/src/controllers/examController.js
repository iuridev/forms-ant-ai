const db = require('../services/sheetsDb');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createExam(req, res) {
  const { title, description, durationMinutes, type } = req.body;
  if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

  const examType = type === 'TAREFA' ? 'TAREFA' : 'PROVA';
  const maxAttempts = examType === 'TAREFA' ? 3 : 1;

  let accessCode;
  let exists = true;
  while (exists) {
    accessCode = generateCode();
    exists = await db.findOne('Exams', e => e.accessCode === accessCode);
  }

  const now = new Date().toISOString();
  const exam = await db.insert('Exams', {
    title, description: description || '', durationMinutes: durationMinutes || 60,
    status: 'DRAFT', accessCode, teacherId: req.user.id,
    type: examType, maxAttempts: String(maxAttempts),
    scheduledStart: '', scheduledEnd: '',
    createdAt: now, updatedAt: now,
  });
  return res.status(201).json(exam);
}

async function listExams(req, res) {
  const exams = await db.findWhere('Exams', e => e.teacherId === req.user.id);
  const questions = await db.readAll('Questions');
  const attempts = await db.readAll('ExamAttempts');

  const result = exams.map(e => ({
    ...e,
    _count: {
      questions: questions.filter(q => q.examId === e.id).length,
      attempts: attempts.filter(a => a.examId === e.id).length,
    },
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json(result);
}

async function getExam(req, res) {
  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const questions = await db.findWhere('Questions', q => q.examId === exam.id);
  questions.sort((a, b) => Number(a.order) - Number(b.order));

  const options = await db.readAll('Options');
  const questionsWithOptions = questions.map(q => ({
    ...q,
    points: Number(q.points),
    order: Number(q.order),
    options: options.filter(o => o.questionId === q.id).map(o => ({ ...o, isCorrect: o.isCorrect === 'true' })),
  }));

  return res.json({ ...exam, durationMinutes: Number(exam.durationMinutes), questions: questionsWithOptions });
}

async function updateExam(req, res) {
  const { title, description, durationMinutes, status, type, scheduledStart, scheduledEnd } = req.body;
  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const newType = type !== undefined ? (type === 'TAREFA' ? 'TAREFA' : 'PROVA') : exam.type || 'PROVA';
  const newMaxAttempts = newType === 'TAREFA' ? '3' : '1';

  const updated = await db.update('Exams', req.params.id, {
    ...exam,
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(durationMinutes !== undefined && { durationMinutes }),
    ...(status !== undefined && { status }),
    ...(scheduledStart !== undefined && { scheduledStart: scheduledStart || '' }),
    ...(scheduledEnd !== undefined && { scheduledEnd: scheduledEnd || '' }),
    type: newType,
    maxAttempts: newMaxAttempts,
    updatedAt: new Date().toISOString(),
  });
  return res.json(updated);
}

async function deleteExam(req, res) {
  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  // Cascade: apaga questões, opções, tentativas, respostas e violações
  const questions = await db.findWhere('Questions', q => q.examId === exam.id);
  for (const q of questions) {
    await db.deleteWhere('Options', o => o.questionId === q.id);
  }
  await db.deleteWhere('Questions', q => q.examId === exam.id);

  const attempts = await db.findWhere('ExamAttempts', a => a.examId === exam.id);
  for (const a of attempts) {
    await db.deleteWhere('Answers', ans => ans.attemptId === a.id);
    await db.deleteWhere('ViolationLogs', v => v.attemptId === a.id);
  }
  await db.deleteWhere('ExamAttempts', a => a.examId === exam.id);
  await db.delete('Exams', exam.id);

  return res.json({ message: 'Prova excluída' });
}

async function addQuestion(req, res) {
  const { text, type, points, options, correctBlank } = req.body;
  if (!text || !type) return res.status(400).json({ error: 'Texto e tipo são obrigatórios' });
  const validTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Tipo inválido' });

  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const existingQs = await db.findWhere('Questions', q => q.examId === req.params.id);

  const question = await db.insert('Questions', {
    examId: req.params.id, text, type, points: points || 1,
    order: existingQs.length + 1,
    correctBlank: type === 'FILL_BLANK' ? (correctBlank || '') : '',
  });

  const createdOptions = [];
  if ((type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') && options) {
    for (const o of options) {
      const opt = await db.insert('Options', { questionId: question.id, text: o.text, isCorrect: String(o.isCorrect) });
      createdOptions.push({ ...opt, isCorrect: opt.isCorrect === 'true' });
    }
  }

  return res.status(201).json({ ...question, points: Number(question.points), options: createdOptions });
}

async function gradeEssay(req, res) {
  const { answerId } = req.params;
  const { pointsEarned, feedback } = req.body;

  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const answer = await db.findById('Answers', answerId);
  if (!answer) return res.status(404).json({ error: 'Resposta não encontrada' });

  const question = await db.findById('Questions', answer.questionId);
  if (!question || question.examId !== exam.id || question.type !== 'ESSAY') {
    return res.status(403).json({ error: 'Esta resposta não é dissertativa' });
  }

  const pts = Math.min(Math.max(Number(pointsEarned) || 0, 0), Number(question.points));
  await db.update('Answers', answerId, {
    ...answer,
    pointsEarned: String(pts),
    isCorrect: String(pts > 0),
    feedback: feedback || '',
  });

  // Recalcula nota da tentativa
  const attempt = await db.findById('ExamAttempts', answer.attemptId);
  const allAnswers = await db.findWhere('Answers', a => a.attemptId === answer.attemptId);
  const questions = await db.findWhere('Questions', q => q.examId === exam.id);

  let totalScore = 0;
  let maxScore = 0;
  for (const q of questions) {
    maxScore += Number(q.points);
    const a = allAnswers.find(ans => ans.questionId === q.id);
    if (a) totalScore += Number(a.pointsEarned) || 0;
  }

  await db.update('ExamAttempts', attempt.id, { ...attempt, score: String(totalScore), maxScore: String(maxScore) });

  return res.json({ pointsEarned: pts, totalScore, maxScore });
}

async function updateQuestion(req, res) {
  const { text, points, options, correctBlank } = req.body;

  const question = await db.findOne('Questions', q => q.id === req.params.questionId && q.examId === req.params.id);
  if (!question) return res.status(404).json({ error: 'Questão não encontrada' });

  await db.deleteWhere('Options', o => o.questionId === question.id);

  const updated = await db.update('Questions', question.id, {
    ...question,
    ...(text !== undefined && { text }),
    ...(points !== undefined && { points }),
    correctBlank: question.type === 'FILL_BLANK' ? (correctBlank || '') : '',
  });

  const createdOptions = [];
  if (options) {
    for (const o of options) {
      const opt = await db.insert('Options', { questionId: question.id, text: o.text, isCorrect: String(o.isCorrect) });
      createdOptions.push({ ...opt, isCorrect: opt.isCorrect === 'true' });
    }
  }

  return res.json({ ...updated, points: Number(updated.points), options: createdOptions });
}

async function deleteQuestion(req, res) {
  const question = await db.findOne('Questions', q => q.id === req.params.questionId && q.examId === req.params.id);
  if (!question) return res.status(404).json({ error: 'Questão não encontrada' });

  await db.deleteWhere('Options', o => o.questionId === question.id);
  await db.delete('Questions', question.id);
  return res.json({ message: 'Questão excluída' });
}

async function getResults(req, res) {
  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const attempts = await db.findWhere('ExamAttempts', a => a.examId === req.params.id);
  const users = await db.readAll('Users');
  const violations = await db.readAll('ViolationLogs');
  const answers = await db.readAll('Answers');
  const questions = await db.findWhere('Questions', q => q.examId === exam.id);
  const options = await db.readAll('Options');

  const result = attempts.map(a => {
    const student = users.find(u => u.id === a.studentId);
    const attemptViolations = violations.filter(v => v.attemptId === a.id)
      .map(v => ({ ...v, durationSeconds: Number(v.durationSeconds) || 0 }));
    const attemptAnswers = answers.filter(ans => ans.attemptId === a.id).map(ans => {
      const q = questions.find(q => q.id === ans.questionId);
      const opt = options.find(o => o.id === ans.selectedOptionId);
      return { ...ans, isCorrect: ans.isCorrect === 'true', pointsEarned: Number(ans.pointsEarned), question: q ? { ...q, points: Number(q.points) } : null, selectedOption: opt || null };
    });
    return {
      ...a,
      score: a.score !== '' ? Number(a.score) : null,
      maxScore: a.maxScore !== '' ? Number(a.maxScore) : null,
      totalFocusLostSeconds: Number(a.totalFocusLostSeconds) || 0,
      student: student ? { id: student.id, name: student.name, email: student.email } : null,
      violations: attemptViolations,
      answers: attemptAnswers,
    };
  }).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  return res.json(result);
}

async function listStudents(req, res) {
  const teacherExams = await db.findWhere('Exams', e => e.teacherId === req.user.id);
  const examIds = new Set(teacherExams.map(e => e.id));

  const allAttempts = await db.findWhere('ExamAttempts', a => examIds.has(a.examId) && a.status === 'SUBMITTED');
  const studentIds = [...new Set(allAttempts.map(a => a.studentId))];
  const users = await db.readAll('Users');

  const students = studentIds.map(sid => {
    const student = users.find(u => u.id === sid);
    const studentAttempts = allAttempts.filter(a => a.studentId === sid);
    const scores = studentAttempts
      .filter(a => a.score !== '' && a.maxScore !== '' && Number(a.maxScore) > 0)
      .map(a => (Number(a.score) / Number(a.maxScore)) * 100);
    const avgScore = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : null;
    const lastAttempt = [...studentAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    return {
      id: sid,
      name: student?.name || 'Desconhecido',
      email: student?.email || '',
      totalAttempts: studentAttempts.length,
      avgScore,
      approvedCount: scores.filter(s => s >= 60).length,
      lastActivity: lastAttempt?.submittedAt,
    };
  }).sort((a, b) => (a.name).localeCompare(b.name));

  return res.json(students);
}

async function getStudentProgress(req, res) {
  const { studentId } = req.params;
  const teacherExams = await db.findWhere('Exams', e => e.teacherId === req.user.id);
  const examMap = Object.fromEntries(teacherExams.map(e => [e.id, e]));
  const examIds = new Set(teacherExams.map(e => e.id));

  const student = await db.findById('Users', studentId);
  if (!student) return res.status(404).json({ error: 'Aluno não encontrado' });

  const attempts = await db.findWhere('ExamAttempts', a =>
    a.studentId === studentId && examIds.has(a.examId) && a.status === 'SUBMITTED'
  );

  const allAnswers = await db.readAll('Answers');
  const allViolations = await db.readAll('ViolationLogs');
  const allQuestions = await db.readAll('Questions');

  const attemptIds = new Set(attempts.map(a => a.id));

  const timeline = attempts.map(a => {
    const exam = examMap[a.examId];
    const score = a.score !== '' ? Number(a.score) : null;
    const maxScore = a.maxScore !== '' ? Number(a.maxScore) : null;
    const pct = score !== null && maxScore ? parseFloat(((score / maxScore) * 100).toFixed(1)) : null;
    return {
      attemptId: a.id, examId: a.examId,
      examTitle: exam?.title || '', examType: exam?.type || 'PROVA',
      submittedAt: a.submittedAt, score, maxScore, pct,
      totalFocusLostSeconds: Number(a.totalFocusLostSeconds) || 0,
    };
  }).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const scores = timeline.filter(t => t.pct !== null).map(t => t.pct);
  const avgScore = scores.length > 0 ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : null;

  // Desempenho por avaliação (melhor tentativa)
  const examPerf = {};
  for (const t of timeline) {
    if (!examPerf[t.examId] || (t.pct !== null && t.pct > (examPerf[t.examId].bestPct ?? -1))) {
      examPerf[t.examId] = { ...t, bestPct: t.pct, attempts: 0 };
    }
    examPerf[t.examId].attempts++;
  }

  // Questões com mais erros
  const questionStats = {};
  const studentAnswers = allAnswers.filter(a => attemptIds.has(a.attemptId));
  for (const ans of studentAnswers) {
    if (!questionStats[ans.questionId]) {
      const q = allQuestions.find(q => q.id === ans.questionId);
      questionStats[ans.questionId] = {
        questionId: ans.questionId, text: q?.text || '',
        examTitle: examMap[q?.examId]?.title || '',
        timesAnswered: 0, timesCorrect: 0,
      };
    }
    questionStats[ans.questionId].timesAnswered++;
    if (ans.isCorrect === 'true') questionStats[ans.questionId].timesCorrect++;
  }
  const weakQuestions = Object.values(questionStats)
    .map(q => ({ ...q, errorRate: parseFloat(((1 - q.timesCorrect / q.timesAnswered) * 100).toFixed(0)) }))
    .filter(q => q.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 8);

  // Violações
  const studentViolations = allViolations.filter(v => attemptIds.has(v.attemptId));
  const violationsByType = {};
  for (const v of studentViolations) violationsByType[v.type] = (violationsByType[v.type] || 0) + 1;

  return res.json({
    student: { id: student.id, name: student.name, email: student.email },
    stats: {
      totalAttempts: attempts.length,
      avgScore,
      bestScore: scores.length > 0 ? Math.max(...scores) : null,
      worstScore: scores.length > 0 ? Math.min(...scores) : null,
      approvedCount: scores.filter(s => s >= 60).length,
      totalViolations: studentViolations.length,
    },
    timeline,
    examPerformance: Object.values(examPerf).sort((a, b) => a.examTitle.localeCompare(b.examTitle)),
    weakQuestions,
    violations: violationsByType,
  });
}

module.exports = { createExam, listExams, getExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion, getResults, listStudents, getStudentProgress, gradeEssay };
