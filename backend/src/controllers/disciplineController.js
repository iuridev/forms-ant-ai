const db = require('../services/sheetsDb');

async function listDisciplines(req, res) {
  const all = await db.readAll('Disciplines');
  // Conta quantas questões cada disciplina tem no banco
  const questions = await db.readAll('QuestionBank');
  const countMap = {};
  for (const q of questions) {
    const tags = (q.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    for (const tag of tags) countMap[tag] = (countMap[tag] || 0) + 1;
  }
  const result = all
    .map(d => ({ ...d, questionCount: countMap[d.name.toLowerCase()] || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return res.json(result);
}

async function createDiscipline(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  const all = await db.readAll('Disciplines');
  const exists = all.find(d => d.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) return res.status(409).json({ error: 'Disciplina já cadastrada' });
  const disc = await db.insert('Disciplines', {
    teacherId: req.user.id,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json(disc);
}

async function deleteDiscipline(req, res) {
  await db.delete('Disciplines', req.params.id);
  return res.json({ ok: true });
}

module.exports = { listDisciplines, createDiscipline, deleteDiscipline };
