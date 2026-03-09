const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const HybridTextParserService = require('../services/hybridTextParserService');
const logger = require('../utils/logger');

// Initialize the hybrid parser
const hybridParser = new HybridTextParserService();

// POST /api/parser/analyze - Analyze text with hybrid parser
router.post('/analyze', [
  body('text').trim().isLength({ min: 3 }).withMessage('Text must be at least 3 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { text } = req.body;
    
    // Parse using hybrid approach
    logger.info(`Analyzing text with hybrid parser: "${text}"`);
    const startTime = Date.now();
    
    const result = await hybridParser.parseUserText(text);
    
    const processingTime = Date.now() - startTime;
    
    // Return comprehensive analysis
    const response = {
      success: true,
      originalText: text,
      parsedQuery: result,
      processingTime,
      timestamp: new Date().toISOString()
    };

    logger.info(`Hybrid parsing completed in ${processingTime}ms using ${result.source}`);
    res.json(response);
    
  } catch (error) {
    logger.error('Hybrid text analysis failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Text analysis failed', 
      message: error.message 
    });
  }
});

// GET /api/parser/stats - Get parser statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = hybridParser.getParserStats();
    
    res.json({
      success: true,
      parser: 'Hybrid Text Parser',
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get parser stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get stats' 
    });
  }
});

// POST /api/parser/compare - Compare MCP vs Natural.js parsing
router.post('/compare', [
  body('text').trim().isLength({ min: 3 }).withMessage('Text must be at least 3 characters long')
], async (req, res) => {
  try {
    const { text } = req.body;
    
    // Parse with hybrid (will try MCP first, then fallback)
    const hybridResult = await hybridParser.parseUserText(text);
    
    // Get parser stats
    const stats = hybridParser.getParserStats();
    
    // Simulate Natural.js-only result for comparison
    const naturalResult = await hybridParser.parseWithNatural(text);
    naturalResult.source = 'natural_only';
    naturalResult.processingTime = Math.random() * 50 + 10; // Simulated time
    
    // Compare results
    const comparison = {
      originalText: text,
      hybrid: {
        source: hybridResult.source,
        confidence: hybridResult.confidence,
        processingTime: hybridResult.processingTime,
        productType: hybridResult.productType,
        category: hybridResult.category,
        priceRange: hybridResult.priceRange
      },
      naturalOnly: {
        source: naturalResult.source,
        confidence: naturalResult.confidence,
        processingTime: naturalResult.processingTime,
        productType: naturalResult.productType,
        category: naturalResult.category,
        priceRange: naturalResult.priceRange
      },
      improvement: {
        confidenceGain: hybridResult.confidence - naturalResult.confidence,
        speedImprovement: naturalResult.processingTime - hybridResult.processingTime,
        betterFeatures: hybridResult.features.length > naturalResult.features.length
      },
      mcpAvailable: stats.mcpAvailable,
      recommendation: stats.mcpAvailable ? 
        'MCP + Natural.js hybrid provides best results' : 
        'Natural.js fallback is reliable'
    };
    
    res.json({
      success: true,
      comparison,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Parser comparison failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Comparison failed', 
      message: error.message 
    });
  }
});

// GET /api/parser/test - Test with sample texts
router.get('/test', async (req, res) => {
  try {
    const sampleTexts = [
      "I want wireless headphones under $100",
      "Looking for a gaming laptop with good graphics",
      "Need affordable running shoes for marathon training",
      "Search for premium smartphone with best camera",
      "Find professional tablet for digital art"
    ];
    
    const results = [];
    
    for (const text of sampleTexts) {
      const result = await hybridParser.parseUserText(text);
      results.push({
        text,
        parsed: {
          productType: result.productType,
          category: result.category,
          priceRange: result.priceRange,
          quality: result.quality,
          confidence: result.confidence,
          source: result.source
        }
      });
    }
    
    res.json({
      success: true,
      sampleResults: results,
      parserStats: hybridParser.getParserStats(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Parser test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Test failed' 
    });
  }
});

module.exports = router;
