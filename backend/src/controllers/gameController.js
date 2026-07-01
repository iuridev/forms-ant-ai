const db = require('../services/sheetsDb');

// Retorna o avatar do aluno logado (ou null se ainda não criou)
async function getAvatar(req, res) {
  const avatar = await db.findOne('GameAvatars', a => a.studentId === req.user.id);
  if (!avatar) return res.json(null);
  return res.json(avatar);
}

// Cria ou atualiza o avatar do aluno logado
async function saveAvatar(req, res) {
  const { name, skinTone, hairStyle, hairColor, outfitColor, accessory } = req.body;
  if (!name || !skinTone || !hairStyle || !hairColor || !outfitColor) {
    return res.status(400).json({ error: 'Dados do avatar incompletos' });
  }

  const existing = await db.findOne('GameAvatars', a => a.studentId === req.user.id);
  const payload = {
    studentId: req.user.id,
    name: String(name).slice(0, 20),
    skinTone, hairStyle, hairColor, outfitColor,
    accessory: accessory || 'none',
    updatedAt: new Date().toISOString(),
  };

  let saved;
  if (existing) {
    saved = await db.update('GameAvatars', existing.id, payload);
  } else {
    saved = await db.insert('GameAvatars', payload);
  }
  return res.json(saved);
}

// Lista o progresso (melhores resultados) do aluno logado, agrupado por jogo
async function getProgress(req, res) {
  const records = await db.findWhere('GameProgress', p => p.studentId === req.user.id);

  const byGame = {};
  for (const r of records) {
    const key = `${r.gameId}-${r.phase}`;
    const item = {
      ...r,
      score: Number(r.score),
      maxScore: Number(r.maxScore),
      stars: Number(r.stars),
      correctAnswers: Number(r.correctAnswers),
      totalQuestions: Number(r.totalQuestions),
    };
    if (!byGame[key] || item.score > byGame[key].score) {
      byGame[key] = item;
    }
  }

  return res.json(Object.values(byGame).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')));
}

// Salva o resultado de uma fase concluída, mantendo apenas o recorde (maior pontuação) do aluno por fase
async function saveProgress(req, res) {
  const { gameId, phase, score, maxScore, stars, correctAnswers, totalQuestions } = req.body;
  if (!gameId || phase === undefined || score === undefined || maxScore === undefined) {
    return res.status(400).json({ error: 'Dados de progresso incompletos' });
  }

  const phaseStr = String(phase);
  const existing = await db.findWhere('GameProgress', p =>
    p.studentId === req.user.id && p.gameId === gameId && p.phase === phaseStr);

  const payload = {
    studentId: req.user.id,
    gameId,
    phase: phaseStr,
    score: String(score),
    maxScore: String(maxScore),
    stars: String(stars ?? 0),
    correctAnswers: String(correctAnswers ?? 0),
    totalQuestions: String(totalQuestions ?? 0),
    completedAt: new Date().toISOString(),
  };

  if (existing.length === 0) {
    const saved = await db.insert('GameProgress', payload);
    return res.status(201).json(saved);
  }

  // Se já havia registro(s) (inclusive duplicados de versões anteriores), mantém só o melhor
  const best = existing.reduce((a, b) => (Number(b.score) > Number(a.score) ? b : a));
  const dupes = existing.filter(r => r.id !== best.id);
  if (dupes.length > 0) {
    await db.deleteWhere('GameProgress', r => dupes.some(d => d.id === r.id));
  }

  if (Number(score) > Number(best.score)) {
    const saved = await db.update('GameProgress', best.id, payload);
    return res.status(200).json(saved);
  }

  return res.status(200).json(best);
}

// Ranking dos melhores resultados de um jogo/fase (todos os alunos)
async function getLeaderboard(req, res) {
  const { gameId } = req.params;
  const { phase = '1' } = req.query;

  const records = await db.findWhere('GameProgress', p => p.gameId === gameId && p.phase === String(phase));
  const users = await db.readAll('Users');
  const avatars = await db.readAll('GameAvatars');

  const bestByStudent = {};
  for (const r of records) {
    const score = Number(r.score);
    if (!bestByStudent[r.studentId] || score > bestByStudent[r.studentId].score) {
      bestByStudent[r.studentId] = { ...r, score };
    }
  }

  const result = Object.values(bestByStudent)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(r => {
      const user = users.find(u => u.id === r.studentId);
      const avatar = avatars.find(a => a.studentId === r.studentId);
      return {
        studentId: r.studentId,
        studentName: avatar?.name || user?.name || 'Aluno',
        score: r.score,
        maxScore: Number(r.maxScore),
        stars: Number(r.stars),
        completedAt: r.completedAt,
      };
    });

  return res.json(result);
}

module.exports = { getAvatar, saveAvatar, getProgress, saveProgress, getLeaderboard };
