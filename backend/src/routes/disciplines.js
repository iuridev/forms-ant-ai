const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middleware/auth');
const { listDisciplines, createDiscipline, deleteDiscipline } = require('../controllers/disciplineController');

router.get('/', authenticate, listDisciplines);
router.post('/', authenticate, requireTeacher, createDiscipline);
router.delete('/:id', authenticate, requireTeacher, deleteDiscipline);

module.exports = router;
