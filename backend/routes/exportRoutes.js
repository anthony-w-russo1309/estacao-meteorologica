const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

router.get('/excel', exportController.exportToExcel);
router.get('/csv', exportController.exportToCSV);
router.get('/json', exportController.exportToJSON);

module.exports = router;