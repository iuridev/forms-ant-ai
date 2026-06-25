const express = require('express');
const { authenticate, requireTeacher } = require('../middleware/auth');
const {
  listBank, addToBank, updateBankQuestion, deleteBankQuestion,
  importToExam, saveExamQuestionToBank,
} = require('../controllers/questionBankController');

const router = express.Router();
router.use(authenticate, requireTeacher);

router.get('/', listBank);
router.post('/', addToBank);
router.put('/:id', updateBankQuestion);
router.delete('/:id', deleteBankQuestion);

// Importar do banco para um exame
router.post('/import-to-exam/:examId', importToExam);

// Salvar questão de um exame no banco
router.post('/from-exam/:examId/questions/:questionId', saveExamQuestionToBank);

module.exports = router;
