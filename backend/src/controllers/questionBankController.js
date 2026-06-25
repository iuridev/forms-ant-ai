const db = require('../services/sheetsDb');

async function listBank(req, res) {
  const questions = await db.findWhere('QuestionBank', q => q.teacherId === req.user.id);
  const allOptions = await db.readAll('QuestionBankOptions');
  const result = questions.map(q => ({
    ...q,
    points: Number(q.points),
    options: allOptions.filter(o => o.questionBankId === q.id).map(o => ({ ...o, isCorrect: o.isCorrect === 'true' })),
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(result);
}

async function addToBank(req, res) {
  const { text, type, points, options, correctBlank, tags } = req.body;
  if (!text || !type) return res.status(400).json({ error: 'Texto e tipo são obrigatórios' });

  const question = await db.insert('QuestionBank', {
    teacherId: req.user.id, text, type, points: points || 1,
    correctBlank: type === 'FILL_BLANK' ? (correctBlank || '') : '',
    tags: tags || '', createdAt: new Date().toISOString(),
  });

  const createdOptions = [];
  if ((type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') && options) {
    for (const o of options) {
      const opt = await db.insert('QuestionBankOptions', { questionBankId: question.id, text: o.text, isCorrect: String(o.isCorrect) });
      createdOptions.push({ ...opt, isCorrect: opt.isCorrect === 'true' });
    }
  }

  return res.status(201).json({ ...question, points: Number(question.points), options: createdOptions });
}

async function updateBankQuestion(req, res) {
  const question = await db.findOne('QuestionBank', q => q.id === req.params.id && q.teacherId === req.user.id);
  if (!question) return res.status(404).json({ error: 'Questão não encontrada' });

  const { text, points, options, correctBlank, tags } = req.body;
  await db.deleteWhere('QuestionBankOptions', o => o.questionBankId === question.id);

  const updated = await db.update('QuestionBank', question.id, {
    ...question,
    ...(text !== undefined && { text }),
    ...(points !== undefined && { points }),
    ...(tags !== undefined && { tags }),
    correctBlank: question.type === 'FILL_BLANK' ? (correctBlank || '') : '',
  });

  const createdOptions = [];
  if (options) {
    for (const o of options) {
      const opt = await db.insert('QuestionBankOptions', { questionBankId: question.id, text: o.text, isCorrect: String(o.isCorrect) });
      createdOptions.push({ ...opt, isCorrect: opt.isCorrect === 'true' });
    }
  }

  return res.json({ ...updated, points: Number(updated.points), options: createdOptions });
}

async function deleteBankQuestion(req, res) {
  const question = await db.findOne('QuestionBank', q => q.id === req.params.id && q.teacherId === req.user.id);
  if (!question) return res.status(404).json({ error: 'Questão não encontrada' });

  await db.deleteWhere('QuestionBankOptions', o => o.questionBankId === question.id);
  await db.delete('QuestionBank', question.id);
  return res.json({ message: 'Questão removida do banco' });
}

// Importa questão do banco para um exame específico
async function importToExam(req, res) {
  const { bankQuestionId } = req.body;
  const { examId } = req.params;

  const bankQ = await db.findOne('QuestionBank', q => q.id === bankQuestionId && q.teacherId === req.user.id);
  if (!bankQ) return res.status(404).json({ error: 'Questão não encontrada no banco' });

  const exam = await db.findOne('Exams', e => e.id === examId && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const existingQs = await db.findWhere('Questions', q => q.examId === examId);

  const question = await db.insert('Questions', {
    examId, text: bankQ.text, type: bankQ.type,
    points: bankQ.points, order: existingQs.length + 1,
    correctBlank: bankQ.correctBlank || '',
  });

  const bankOptions = await db.findWhere('QuestionBankOptions', o => o.questionBankId === bankQ.id);
  const createdOptions = [];
  for (const o of bankOptions) {
    const opt = await db.insert('Options', { questionId: question.id, text: o.text, isCorrect: o.isCorrect });
    createdOptions.push({ ...opt, isCorrect: opt.isCorrect === 'true' });
  }

  return res.status(201).json({ ...question, points: Number(question.points), options: createdOptions });
}

// Salva questão de um exame diretamente no banco
async function saveExamQuestionToBank(req, res) {
  const { questionId } = req.params;
  const exam = await db.findOne('Exams', e => e.id === req.params.examId && e.teacherId === req.user.id);
  if (!exam) return res.status(404).json({ error: 'Prova não encontrada' });

  const question = await db.findOne('Questions', q => q.id === questionId && q.examId === exam.id);
  if (!question) return res.status(404).json({ error: 'Questão não encontrada' });

  const options = await db.findWhere('Options', o => o.questionId === question.id);

  const bankQ = await db.insert('QuestionBank', {
    teacherId: req.user.id, text: question.text, type: question.type,
    points: question.points, correctBlank: question.correctBlank || '',
    tags: '', createdAt: new Date().toISOString(),
  });

  for (const o of options) {
    await db.insert('QuestionBankOptions', { questionBankId: bankQ.id, text: o.text, isCorrect: o.isCorrect });
  }

  return res.status(201).json({ ...bankQ, points: Number(bankQ.points) });
}

module.exports = { listBank, addToBank, updateBankQuestion, deleteBankQuestion, importToExam, saveExamQuestionToBank };
