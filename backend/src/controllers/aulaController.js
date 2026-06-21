const db = require('../services/sheetsDb');

async function createAula(req, res) {
  const group = await db.findById('Groups', req.params.groupId);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const { title, description, slideUrl } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título é obrigatório' });
  if (!slideUrl?.trim()) return res.status(400).json({ error: 'URL do slide é obrigatória' });

  const existing = await db.findWhere('Aulas', a => a.groupId === req.params.groupId);
  const order = existing.length + 1;

  const aula = await db.insert('Aulas', {
    title: title.trim(),
    description: description?.trim() || '',
    slideUrl: slideUrl.trim(),
    groupId: req.params.groupId,
    teacherId: req.user.id,
    order: String(order),
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(aula);
}

async function listGroupAulas(req, res) {
  const group = await db.findById('Groups', req.params.groupId);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const aulas = await db.findWhere('Aulas', a => a.groupId === req.params.groupId);
  aulas.sort((a, b) => Number(a.order) - Number(b.order));
  return res.json(aulas);
}

async function updateAula(req, res) {
  const aula = await db.findById('Aulas', req.params.aulaId);
  if (!aula || aula.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Aula não encontrada' });
  }

  const { title, description, slideUrl } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título é obrigatório' });
  if (!slideUrl?.trim()) return res.status(400).json({ error: 'URL do slide é obrigatória' });

  const updated = await db.update('Aulas', req.params.aulaId, {
    title: title.trim(),
    description: description?.trim() ?? aula.description,
    slideUrl: slideUrl.trim(),
  });

  return res.json(updated);
}

async function deleteAula(req, res) {
  const aula = await db.findById('Aulas', req.params.aulaId);
  if (!aula || aula.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Aula não encontrada' });
  }

  await db.delete('Aulas', req.params.aulaId);
  return res.json({ success: true });
}

// Para o aluno: lista aulas das turmas em que está matriculado
async function getMyAulas(req, res) {
  const memberships = await db.findWhere('GroupMembers', m => m.studentId === req.user.id);
  const groupIds = memberships.map(m => m.groupId);

  if (groupIds.length === 0) return res.json([]);

  const allAulas = await db.findWhere('Aulas', a => groupIds.includes(a.groupId));
  allAulas.sort((a, b) => Number(a.order) - Number(b.order));

  const allGroups = await db.readAll('Groups');
  const result = allAulas.map(a => {
    const group = allGroups.find(g => g.id === a.groupId);
    return { ...a, groupName: group?.name || '' };
  });

  return res.json(result);
}

module.exports = { createAula, listGroupAulas, updateAula, deleteAula, getMyAulas };
