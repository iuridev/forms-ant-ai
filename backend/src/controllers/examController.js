const db = require('../services/sheetsDb');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createExam(req, res) {
  const { title, description, durationMinutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

  let accessCode;
  let exists = true;
  while (exists) {
    accessCode = generateCode();
    exists = await db.findOne('Exams', e => e.accessCode === accessCode);
  }

  const now = new Date().toISOString();
  const exam = await db.insert('Exams', {
    title, description: description || '', durationMinutes: durationMinutes || 60,
    status: 'DRAFT', accessCode, teacherId: req.user.id, createdAt: now, updatedAt: now,
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
  const { title, description, durationMinutes, status } = req.body;
  const exam = await db.findOne('Exams', e => e.id === req.params.id && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const updated = await db.update('Exams', req.params.id, {
    ...exam,
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(durationMinutes !== undefined && { durationMinutes }),
    ...(status !== undefined && { status }),
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

module.exports = { createExam, listExams, getExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion, getResults };
