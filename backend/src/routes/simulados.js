const express = require('express');
const router = express.Router();
const { authenticate, requireStudent, requireTeacher } = require('../middleware/auth');
const {
  getTags, startSimulado, submitSimulado, getMySimulados, getSimuladoDetail, getStudentSimulados,
} = require('../controllers/simuladoController');

router.get('/tags', authenticate, getTags);
router.post('/start', authenticate, requireStudent, startSimulado);
router.post('/:id/submit', authenticate, requireStudent, submitSimulado);
router.get('/my', authenticate, requireStudent, getMySimulados);
router.get('/:id', authenticate, requireStudent, getSimuladoDetail);
router.get('/student/:studentId', authenticate, requireTeacher, getStudentSimulados);

module.exports = router;
