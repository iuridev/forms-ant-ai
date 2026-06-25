const express = require('express');
const { authenticate, requireTeacher } = require('../middleware/auth');
const {
  createExam, listExams, getExam, updateExam, deleteExam,
  addQuestion, updateQuestion, deleteQuestion, getResults,
  listStudents, getStudentProgress, gradeEssay,
} = require('../controllers/examController');

const router = express.Router();

router.use(authenticate, requireTeacher);

router.get('/', listExams);
router.post('/', createExam);
// rotas de alunos antes de /:id para evitar conflito
router.get('/students', listStudents);
router.get('/students/:studentId', getStudentProgress);
router.get('/:id', getExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

router.post('/:id/questions', addQuestion);
router.put('/:id/questions/:questionId', updateQuestion);
router.delete('/:id/questions/:questionId', deleteQuestion);

router.get('/:id/results', getResults);
router.put('/:id/answers/:answerId/grade-essay', gradeEssay);

module.exports = router;
