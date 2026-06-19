const db = require('../services/sheetsDb');

async function createGroup(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome da turma é obrigatório' });

  const group = await db.insert('Groups', {
    name: name.trim(),
    teacherId: req.user.id,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(group);
}

async function listGroups(req, res) {
  const groups = await db.findWhere('Groups', g => g.teacherId === req.user.id);
  const allMembers = await db.readAll('GroupMembers');
  const allExamGroups = await db.readAll('ExamGroups');

  const result = groups.map(g => ({
    ...g,
    memberCount: allMembers.filter(m => m.groupId === g.id).length,
    examCount: allExamGroups.filter(eg => eg.groupId === g.id).length,
  }));

  return res.json(result);
}

async function getGroup(req, res) {
  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const members = await db.findWhere('GroupMembers', m => m.groupId === group.id);
  const allUsers = await db.readAll('Users');
  const examGroups = await db.findWhere('ExamGroups', eg => eg.groupId === group.id);
  const allExams = await db.readAll('Exams');

  return res.json({
    ...group,
    members: members.map(m => {
      const user = allUsers.find(u => u.id === m.studentId);
      return { memberId: m.id, studentId: m.studentId, addedAt: m.addedAt, name: user?.name || '', email: user?.email || '' };
    }),
    exams: examGroups.map(eg => {
      const exam = allExams.find(e => e.id === eg.examId);
      return { examGroupId: eg.id, examId: eg.examId, title: exam?.title || '', type: exam?.type || 'PROVA', status: exam?.status || '' };
    }),
  });
}

async function updateGroup(req, res) {
  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  const updated = await db.update('Groups', group.id, { ...group, name: name.trim() });
  return res.json(updated);
}

async function deleteGroup(req, res) {
  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  await db.deleteWhere('GroupMembers', m => m.groupId === group.id);
  await db.deleteWhere('ExamGroups', eg => eg.groupId === group.id);
  await db.delete('Groups', group.id);

  return res.json({ ok: true });
}

async function addMember(req, res) {
  const { publicCode } = req.body;
  if (!publicCode?.trim()) return res.status(400).json({ error: 'Código do aluno é obrigatório' });

  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const student = await db.findOne('Users', u => u.publicCode === publicCode.trim().toUpperCase() && u.role === 'STUDENT');
  if (!student) return res.status(404).json({ error: 'Aluno não encontrado. Verifique o código.' });

  const existing = await db.findOne('GroupMembers', m => m.groupId === group.id && m.studentId === student.id);
  if (existing) return res.status(409).json({ error: 'Aluno já está nesta turma' });

  const member = await db.insert('GroupMembers', {
    groupId: group.id,
    studentId: student.id,
    addedAt: new Date().toISOString(),
  });

  return res.status(201).json({
    memberId: member.id, studentId: student.id,
    name: student.name, email: student.email,
    addedAt: member.addedAt,
  });
}

async function removeMember(req, res) {
  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const member = await db.findById('GroupMembers', req.params.memberId);
  if (!member || member.groupId !== group.id) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }

  await db.delete('GroupMembers', member.id);
  return res.json({ ok: true });
}

async function assignExam(req, res) {
  const { examId } = req.body;
  if (!examId) return res.status(400).json({ error: 'examId é obrigatório' });

  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const exam = await db.findById('Exams', examId);
  if (!exam || exam.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Avaliação não encontrada' });
  }

  const existing = await db.findOne('ExamGroups', eg => eg.examId === examId && eg.groupId === group.id);
  if (existing) return res.status(409).json({ error: 'Avaliação já vinculada a esta turma' });

  const link = await db.insert('ExamGroups', { examId, groupId: group.id });
  return res.status(201).json(link);
}

async function unassignExam(req, res) {
  const group = await db.findById('Groups', req.params.id);
  if (!group || group.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }

  const link = await db.findOne('ExamGroups', eg => eg.examId === req.params.examId && eg.groupId === group.id);
  if (!link) return res.status(404).json({ error: 'Vínculo não encontrado' });

  await db.delete('ExamGroups', link.id);
  return res.json({ ok: true });
}

async function getGroupsForExam(req, res) {
  const exam = await db.findById('Exams', req.params.examId);
  if (!exam || exam.teacherId !== req.user.id) {
    return res.status(404).json({ error: 'Avaliação não encontrada' });
  }

  const teacherGroups = await db.findWhere('Groups', g => g.teacherId === req.user.id);
  const examGroups = await db.findWhere('ExamGroups', eg => eg.examId === exam.id);
  const linkedGroupIds = new Set(examGroups.map(eg => eg.groupId));

  const allMembers = await db.readAll('GroupMembers');

  return res.json(teacherGroups.map(g => ({
    ...g,
    linked: linkedGroupIds.has(g.id),
    memberCount: allMembers.filter(m => m.groupId === g.id).length,
  })));
}

async function getPendingAssignments(req, res) {
  const myMemberships = await db.findWhere('GroupMembers', m => m.studentId === req.user.id);
  if (myMemberships.length === 0) return res.json([]);

  const myGroupIds = new Set(myMemberships.map(m => m.groupId));
  const examGroupLinks = await db.findWhere('ExamGroups', eg => myGroupIds.has(eg.groupId));
  if (examGroupLinks.length === 0) return res.json([]);

  const allExams = await db.readAll('Exams');
  const allAttempts = await db.findWhere('ExamAttempts', a => a.studentId === req.user.id);
  const allGroups = await db.readAll('Groups');

  const seenExamIds = new Set();
  const result = [];

  for (const link of examGroupLinks) {
    if (seenExamIds.has(link.examId)) continue;
    seenExamIds.add(link.examId);

    const exam = allExams.find(e => e.id === link.examId);
    if (!exam || exam.status !== 'ACTIVE') continue;

    const group = allGroups.find(g => g.id === link.groupId);
    const maxAttempts = Number(exam.maxAttempts) || 1;
    const submittedAttempts = allAttempts.filter(a => a.examId === exam.id && a.status === 'SUBMITTED');
    const inProgressAttempt = allAttempts.find(a => a.examId === exam.id && a.status === 'IN_PROGRESS');
    const attemptsUsed = submittedAttempts.length;

    result.push({
      examId: exam.id,
      title: exam.title,
      type: exam.type || 'PROVA',
      maxAttempts,
      attemptsUsed,
      remainingAttempts: Math.max(0, maxAttempts - attemptsUsed),
      canAttempt: attemptsUsed < maxAttempts,
      inProgressAttemptId: inProgressAttempt?.id || null,
      groupName: group?.name || '',
      accessCode: exam.accessCode,
    });
  }

  return res.json(result);
}

module.exports = {
  createGroup, listGroups, getGroup, updateGroup, deleteGroup,
  addMember, removeMember,
  assignExam, unassignExam,
  getGroupsForExam,
  getPendingAssignments,
};
