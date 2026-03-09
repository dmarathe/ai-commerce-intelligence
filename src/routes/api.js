const express = require('express');
const router = express.Router();

// Import route modules
const productRoutes = require('./products');
const recommendationRoutes = require('./recommendations');
const analyticsRoutes = require('./analytics');
const searchRoutes = require('./search');
const parserRoutes = require('./parser');

// API version and info
router.get('/', (req, res) => {
  res.json({
    name: 'AI Commerce Intelligence API',
    version: '1.0.0',
    description: 'API for AI-powered commerce intelligence and product recommendations',
    endpoints: {
      products: '/api/products',
      recommendations: '/api/recommendations',
      analytics: '/api/analytics',
      search: '/api/search',
      parser: '/api/parser'
    },
    documentation: '/api/docs'
  });
});

// Route modules
router.use('/products', productRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/search', searchRoutes);
router.use('/parser', parserRoutes);

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    title: 'AI Commerce Intelligence API Documentation',
    version: '1.0.0',
    endpoints: {
      'GET /api': 'API information and endpoints list',
      'GET /api/products': 'Get all products',
      'GET /api/products/:id': 'Get product by ID',
      'POST /api/products': 'Create new product',
      'GET /api/recommendations': 'Get product recommendations',
      'POST /api/recommendations': 'Generate new recommendations',
      'GET /api/analytics': 'Get analytics data',
      'GET /api/analytics/trends': 'Get market trends',
      'POST /api/search/text': 'Parse text and search products',
      'GET /api/search/products': 'Direct product search',
      'GET /api/search/suggestions': 'Get search suggestions',
      'POST /api/parser/analyze': 'Analyze text with hybrid parser',
      'GET /api/parser/stats': 'Get parser statistics',
      'POST /api/parser/compare': 'Compare MCP vs Natural.js',
      'GET /api/parser/test': 'Test parser with samples',
      'GET /health': 'Health check endpoint'
    },
    authentication: 'JWT tokens required for protected endpoints',
    rateLimit: '100 requests per 15 minutes per IP'
  });
});

module.exports = router;
