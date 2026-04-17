// ==================== backend/routes/historyRoutes.js ====================
const express = require('express');
const router = express.Router();
const Weather = require('../models/weatherModel');
const storageService = require('../services/storageService');
const database = require('../database');

// GET /api/history - Últimos registros
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const data = await storageService.getHistoryFromMongo(limit);
        
        res.json({
            success: true,
            source: 'mongodb',
            total: data.length,
            data: data
        });
    } catch (error) {
        // Fallback para SQLite
        const data = await database.buscarUltimas(50);
        res.json({
            success: true,
            source: 'sqlite_fallback',
            total: data.length,
            data: data
        });
    }
});

// GET /api/history/stats - Estatísticas
router.get('/stats', async (req, res) => {
    const stats = await storageService.getStatsFromMongo();
    res.json(stats);
});

// GET /api/history/range - Buscar por período
router.get('/range', async (req, res) => {
    const { start, end, limit } = req.query;
    const data = await storageService.getHistoryFromMongo(
        parseInt(limit) || 100,
        start,
        end
    );
    res.json(data);
});

// GET /api/history/media24h - Média das últimas 24h
router.get('/media24h', async (req, res) => {
    const media = await Weather.getMedia24h();
    res.json(media);
});

module.exports = router;