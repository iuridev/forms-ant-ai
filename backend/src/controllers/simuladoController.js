const db = require('../services/sheetsDb');

// Lista disciplinas cadastradas com contagem de questões disponíveis
async function getTags(req, res) {
  const disciplines = await db.readAll('Disciplines');
  const questions = await db.readAll('QuestionBank');

  // Monta contagem por disciplina
  const countMap = {};
  for (const q of questions) {
    if (q.type === 'ESSAY') continue;
    const tags = (q.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    for (const tag of tags) countMap[tag] = (countMap[tag] || 0) + 1;
  }

  const result = disciplines.map(d => ({
    id: d.id,
    tag: d.name,
    questionCount: countMap[d.name.toLowerCase()] || 0,
  })).sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));

  return res.json(result);
}

// Inicia simulado: aceita uma ou múltiplas disciplinas
async function startSimulado(req, res) {
  const { disciplines, discipline, count = 10 } = req.body;

  // Suporte a array (novo) ou string única (legado)
  const selected = Array.isArray(disciplines) && disciplines.length > 0
    ? disciplines
    : discipline ? [discipline] : [];

  if (selected.length === 0) return res.status(400).json({ error: 'Selecione ao menos uma disciplina' });

  const n = Math.min(Math.max(Number(count), 3), 30);
  const allQuestions = await db.readAll('QuestionBank');
  const allOptions = await db.readAll('QuestionBankOptions');

  const selectedLower = selected.map(d => d.toLowerCase());

  const matching = allQuestions.filter(q => {
    if (q.type === 'ESSAY') return false;
    const tags = (q.tags || '').split(',').map(t => t.trim().toLowerCase());
    return tags.some(t => selectedLower.includes(t));
  });

  if (matching.length < 3) {
    return res.status(400).json({
      error: `Não há questões suficientes para as disciplinas selecionadas. Mínimo: 3 questões (sem dissertativas).`,
    });
  }

  const shuffled = [...matching].sort(() => Math.random() - 0.5);
  const selectedQs = shuffled.slice(0, Math.min(n, shuffled.length));
  const disciplineLabel = selected.join(', ');

  const simulado = await db.insert('Simulados', {
    studentId: req.user.id,
    discipline: disciplineLabel,
    totalQuestions: String(selectedQs.length),
    score: '', maxScore: '',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    submittedAt: '',
  });

  const questions = selectedQs.map(q => {
    const options = allOptions
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

// Entrega o simulado com correção automática
async function submitSimulado(req, res) {
  const { answers } = req.body;

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

    savedAnswers.push({ ...saved, isCorrect, pointsEarned, maxPoints: pts });
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

async function getSimuladoDetail(req, res) {
  const simulado = await db.findOne('Simulados', s => s.id === req.params.id && s.studentId === req.user.id);
  if (!simulado) return res.status(404).json({ error: 'Simulado não encontrado' });

  const answers = await db.findWhere('SimuladoAnswers', a => a.simuladoId === simulado.id);

  return res.json({
    simulado: { ...simulado, score: Number(simulado.score), maxScore: Number(simulado.maxScore), totalQuestions: Number(simulado.totalQuestions) },
    answers: answers.map(a => ({ ...a, isCorrect: a.isCorrect === 'true', pointsEarned: Number(a.pointsEarned), maxPoints: Number(a.maxPoints) })),
  });
}

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

  const byDiscipline = {};
  for (const s of result) {
    const discs = s.discipline.split(',').map(d => d.trim());
    for (const disc of discs) {
      if (!byDiscipline[disc]) byDiscipline[disc] = [];
      byDiscipline[disc].push(s);
    }
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
