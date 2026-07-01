const express = require('express');
const { authenticate, requireStudent } = require('../middleware/auth');
const {
  getAvatar, saveAvatar, getProgress, saveProgress, getLeaderboard,
} = require('../controllers/gameController');

const router = express.Router();

router.get('/avatar', authenticate, requireStudent, getAvatar);
router.put('/avatar', authenticate, requireStudent, saveAvatar);
router.get('/progress', authenticate, requireStudent, getProgress);
router.post('/progress', authenticate, requireStudent, saveProgress);
router.get('/leaderboard/:gameId', authenticate, getLeaderboard);

module.exports = router;
