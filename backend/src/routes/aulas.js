const express = require('express');
const { authenticate, requireTeacher, requireStudent } = require('../middleware/auth');
const { createAula, listGroupAulas, updateAula, deleteAula, getMyAulas } = require('../controllers/aulaController');

const router = express.Router();

// Rota do aluno
router.get('/my', authenticate, requireStudent, getMyAulas);

// Rotas do professor
router.get('/group/:groupId', authenticate, requireTeacher, listGroupAulas);
router.post('/group/:groupId', authenticate, requireTeacher, createAula);
router.put('/:aulaId', authenticate, requireTeacher, updateAula);
router.delete('/:aulaId', authenticate, requireTeacher, deleteAula);

module.exports = router;
