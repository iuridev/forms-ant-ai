const express = require('express');
const { authenticate, requireStudent } = require('../middleware/auth');
const { startExam, saveAnswer, submitExam, logViolation, getMyAttempts, getAttemptDetail, getAttemptExam } = require('../controllers/attemptController');

const router = express.Router();

router.use(authenticate, requireStudent);

router.post('/start', startExam);
router.get('/my', getMyAttempts);
router.get('/:id', getAttemptDetail);
router.get('/:id/exam', getAttemptExam);
router.post('/:id/answers', saveAnswer);
router.post('/:id/submit', submitExam);
router.post('/:id/violations', logViolation);

module.exports = router;
