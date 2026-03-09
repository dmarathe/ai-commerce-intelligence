const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Recommendation = require('../models/Recommendation');
const logger = require('../utils/logger');

// GET /api/recommendations - Get recommendations
router.get('/', async (req, res) => {
  try {
    const { userId, type, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (userId) query.user_id = userId;
    if (type) query.recommendation_type = type;

    const recommendations = await Recommendation.find(query)
      .limit(parseInt(limit))
      .sort({ created_at: -1 });

    res.json({
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// GET /api/recommendations/:id - Get recommendation by ID
router.get('/:id', async (req, res) => {
  try {
    const recommendation = await Recommendation.findById(req.params.id);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(recommendation);
  } catch (error) {
    logger.error('Error fetching recommendation:', error);
    res.status(500).json({ error: 'Failed to fetch recommendation' });
  }
});

// POST /api/recommendations - Generate new recommendations
router.post('/', [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('product_ids').isArray().withMessage('Product IDs must be an array'),
  body('recommendation_type').isIn(['collaborative', 'content-based', 'hybrid']).withMessage('Invalid recommendation type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, product_ids, recommendation_type, confidence_score, reasoning } = req.body;

    // Simple recommendation logic (will be enhanced with ML later)
    const recommendation = new Recommendation({
      user_id,
      product_ids,
      recommendation_type,
      confidence_score: confidence_score || Math.random() * 0.5 + 0.5, // Random score 0.5-1.0
      reasoning: reasoning || `Generated ${recommendation_type} recommendations for user ${user_id}`
    });

    await recommendation.save();

    logger.info(`New recommendation created: ${recommendation._id}`);
    res.status(201).json(recommendation);
  } catch (error) {
    logger.error('Error creating recommendation:', error);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// GET /api/recommendations/user/:userId - Get recommendations for specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recommendations = await Recommendation.find({ user_id: req.params.userId })
      .limit(parseInt(limit))
      .sort({ created_at: -1 });

    res.json({
      user_id: req.params.userId,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Error fetching user recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch user recommendations' });
  }
});

module.exports = router;
