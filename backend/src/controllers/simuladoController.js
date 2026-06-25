const db = require('../services/sheetsDb');

// Lista todas as disciplinas (tags) disponíveis no banco de questões
async function getTags(req, res) {
  const questions = await db.readAll('QuestionBank');
  const tagMap = {};

  for (const q of questions) {
    const tags = (q.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (!tagMap[key]) tagMap[key] = { tag, questionCount: 0 };
      tagMap[key].questionCount++;
    }
  }

  const result = Object.values(tagMap)
    .filter(t => t.questionCount >= 1)
    .sort((a, b) => b.questionCount - a.questionCount);

  return res.json(result);
}

// Inicia simulado: sorteia questões do banco pela disciplina escolhida
async function startSimulado(req, res) {
  const { discipline, count = 10 } = req.body;
  if (!discipline) return res.status(400).json({ error: 'Disciplina obrigatória' });

  const n = Math.min(Math.max(Number(count), 3), 30);
  const allQuestions = await db.readAll('QuestionBank');
  const allOptions = await db.readAll('QuestionBankOptions');

  const matching = allQuestions.filter(q => {
    const tags = (q.tags || '').split(',').map(t => t.trim().toLowerCase());
    return tags.includes(discipline.toLowerCase()) && q.type !== 'ESSAY';
  });

  if (matching.length < 3) {
    return res.status(400).json({ error: `Não há questões suficientes para "${discipline}". Mínimo: 3 questões (sem dissertativas).` });
  }

  // Shuffle real (simulado é aleatório a cada vez)
  const shuffled = [...matching].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(n, shuffled.length));

  const simulado = await db.insert('Simulados', {
    studentId: req.user.id,
    discipline,
    totalQuestions: String(selected.length),
    score: '', maxScore: '',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    submittedAt: '',
  });

  const questions = selected.map(q => {
    let options = allOptions
      .filter(o => o.questionBankId === q.id)
      .map(o => ({ id: o.id, text: o.text }))
      .sort(() => Math.random() - 0.5);

    return {
      bankQuestionId: q.id,
      text: q.text,
      type: q.type,
      points: Number(q.points),
      options,
    };
  });

  return res.status(201).json({ simulado, questions });
}

// Entrega o simulado com todas as respostas de uma vez
async function submitSimulado(req, res) {
  const { answers } = req.body; // [{ bankQuestionId, selectedOptionId?, textAnswer? }]

  const simulado = await db.findOne('Simulados', s => s.id === req.params.id && s.studentId === req.user.id);
  if (!simulado) return res.status(404).json({ error: 'Simulado não encontrado' });
  if (simulado.status === 'SUBMITTED') return res.status(409).json({ error: 'Simulado já entregue' });

  const allBankQuestions = await db.readAll('QuestionBank');
  const allBankOptions = await db.readAll('QuestionBankOptions');

  let totalScore = 0;
  let maxScore = 0;
  const savedAnswers = [];

  for (const ans of (answers || [])) {
    const q = allBankQuestions.find(bq => bq.id === ans.bankQuestionId);
    if (!q) continue;

    const pts = Number(q.points) || 1;
    maxScore += pts;

    const options = allBankOptions.filter(o => o.questionBankId === q.id);
    const correctOpt = options.find(o => o.isCorrect === 'true');
    const correctAnswer = correctOpt?.text || q.correctBlank || '';

    let isCorrect = false;
    let selectedAnswer = '';

    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
      const sel = options.find(o => o.id === ans.selectedOptionId);
      selectedAnswer = sel?.text || '';
      isCorrect = !!(correctOpt && ans.selectedOptionId === correctOpt.id);
    } else if (q.type === 'FILL_BLANK') {
      selectedAnswer = (ans.textAnswer || '').trim();
      isCorrect = selectedAnswer.toLowerCase() === (q.correctBlank || '').trim().toLowerCase();
    }

    const pointsEarned = isCorrect ? pts : 0;
    totalScore += pointsEarned;

    const saved = await db.insert('SimuladoAnswers', {
      simuladoId: simulado.id,
      questionBankId: q.id,
      questionText: q.text,
      questionType: q.type,
      isCorrect: String(isCorrect),
      pointsEarned: String(pointsEarned),
      maxPoints: String(pts),
      selectedAnswer,
      correctAnswer,
    });

    savedAnswers.push({
      ...saved,
      isCorrect,
      pointsEarned,
      maxPoints: pts,
    });
  }

  const updated = await db.update('Simulados', simulado.id, {
    ...simulado,
    score: String(totalScore),
    maxScore: String(maxScore),
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
  });

  return res.json({
    simulado: { ...updated, score: totalScore, maxScore },
    answers: savedAnswers,
    percentage: maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(1)) : 0,
  });
}

// Histórico de simulados do aluno logado
async function getMySimulados(req, res) {
  const simulados = await db.findWhere('Simulados', s => s.studentId === req.user.id && s.status === 'SUBMITTED');

  return res.json(
    simulados.map(s => ({
      ...s,
      score: s.score !== '' ? Number(s.score) : null,
      maxScore: s.maxScore !== '' ? Number(s.maxScore) : null,
      totalQuestions: Number(s.totalQuestions),
      percentage: s.score !== '' && s.maxScore !== '' && Number(s.maxScore) > 0
        ? parseFloat(((Number(s.score) / Number(s.maxScore)) * 100).toFixed(1))
        : null,
    })).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
  );
}

// Detalhes de um simulado (para resultado)
async function getSimuladoDetail(req, res) {
  const simulado = await db.findOne('Simulados', s => s.id === req.params.id && s.studentId === req.user.id);
  if (!simulado) return res.status(404).json({ error: 'Simulado não encontrado' });

  const answers = await db.findWhere('SimuladoAnswers', a => a.simuladoId === simulado.id);

  return res.json({
    simulado: { ...simulado, score: Number(simulado.score), maxScore: Number(simulado.maxScore), totalQuestions: Number(simulado.totalQuestions) },
    answers: answers.map(a => ({ ...a, isCorrect: a.isCorrect === 'true', pointsEarned: Number(a.pointsEarned), maxPoints: Number(a.maxPoints) })),
  });
}

// Professor visualiza simulados de um aluno
async function getStudentSimulados(req, res) {
  const { studentId } = req.params;
  const simulados = await db.findWhere('Simulados', s => s.studentId === studentId && s.status === 'SUBMITTED');

  const result = simulados.map(s => ({
    ...s,
    score: s.score !== '' ? Number(s.score) : null,
    maxScore: s.maxScore !== '' ? Number(s.maxScore) : null,
    totalQuestions: Number(s.totalQuestions),
    percentage: s.score !== '' && s.maxScore !== '' && Number(s.maxScore) > 0
      ? parseFloat(((Number(s.score) / Number(s.maxScore)) * 100).toFixed(1))
      : null,
  })).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

  // Agrupa por disciplina para estatísticas
  const byDiscipline = {};
  for (const s of result) {
    if (!byDiscipline[s.discipline]) byDiscipline[s.discipline] = [];
    byDiscipline[s.discipline].push(s);
  }

  const disciplineStats = Object.entries(byDiscipline).map(([discipline, sims]) => {
    const pcts = sims.filter(s => s.percentage !== null).map(s => s.percentage);
    return {
      discipline,
      count: sims.length,
      avgPercentage: pcts.length ? parseFloat((pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)) : null,
      bestPercentage: pcts.length ? Math.max(...pcts) : null,
    };
  }).sort((a, b) => b.count - a.count);

  return res.json({ simulados: result, disciplineStats });
}

module.exports = { getTags, startSimulado, submitSimulado, getMySimulados, getSimuladoDetail, getStudentSimulados };
