const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { renderDashboardHtml } = require('../web/dashboardHtml');
const logger = require('../utils/logger');

/**
 * GET /dashboard (and /webapp)
 * Renders the full interactive Web Dashboard
 */
router.get(['/dashboard', '/webapp'], async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const forceDemo = req.query.demo === '1' || req.query.demo === 'true';
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const data = await dashboardService.getDashboardData(period, startDate, endDate, forceDemo);
    const html = renderDashboardHtml(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    logger.error('Error rendering dashboard page:', err);
    return res.status(500).send(`<h1>500 - Failed to load dashboard</h1><p>${err.message}</p>`);
  }
});

/**
 * GET /api/dashboard/stats
 * Returns JSON statistics, time series, and transactions for AJAX updates
 */
router.get('/api/dashboard/stats', async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const forceDemo = req.query.demo === '1' || req.query.demo === 'true';
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const data = await dashboardService.getDashboardData(period, startDate, endDate, forceDemo);
    return res.json(data);
  } catch (err) {
    logger.error('Error fetching dashboard stats API:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
