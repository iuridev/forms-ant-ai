const express = require('express');
const { authenticate, requireTeacher } = require('../middleware/auth');
const {
  createExam, listExams, getExam, updateExam, deleteExam,
  addQuestion, updateQuestion, deleteQuestion, getResults,
} = require('../controllers/examController');

const router = express.Router();

router.use(authenticate, requireTeacher);

router.get('/', listExams);
router.post('/', createExam);
router.get('/:id', getExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

router.post('/:id/questions', addQuestion);
router.put('/:id/questions/:questionId', updateQuestion);
router.delete('/:id/questions/:questionId', deleteQuestion);

router.get('/:id/results', getResults);

module.exports = router;
