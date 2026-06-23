const express = require('express');
const { authenticate, requireTeacher, requireStudent } = require('../middleware/auth');
const {
  createGroup, listGroups, getGroup, updateGroup, deleteGroup,
  addMember, removeMember,
  assignExam, unassignExam,
  getGroupsForExam,
  getPendingAssignments,
  getMyGroups,
  getMyProgressInGroup,
} = require('../controllers/groupController');

const router = express.Router();

// Rotas de aluno — registradas antes do middleware requireTeacher
router.get('/my-pending', authenticate, requireStudent, getPendingAssignments);
router.get('/my-groups', authenticate, requireStudent, getMyGroups);
router.get('/:id/my-progress', authenticate, requireStudent, getMyProgressInGroup);

// Rota usada pelo ExamDetail para saber quais turmas estão vinculadas
router.get('/for-exam/:examId', authenticate, requireTeacher, getGroupsForExam);

// Todas as outras rotas requerem professor
router.use(authenticate, requireTeacher);

router.get('/', listGroups);
router.post('/', createGroup);
router.get('/:id', getGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

router.post('/:id/exams', assignExam);
router.delete('/:id/exams/:examId', unassignExam);

module.exports = router;
