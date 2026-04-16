const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/latest', weatherController.getLatest);
router.get('/history/:limit?', weatherController.getHistory);
router.get('/history', weatherController.getHistoryWithFilters);
router.get('/comparison', weatherController.getComparison);
router.get('/forecast', weatherController.getForecast);
router.post('/config', weatherController.saveConfig);
router.get('/config', weatherController.getConfig);

module.exports = router;