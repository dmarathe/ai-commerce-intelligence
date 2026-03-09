const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const HybridTextParserService = require('../services/hybridTextParserService');
const RealPlatformSearchService = require('../services/realPlatformSearchService');
const logger = require('../utils/logger');

// Initialize services
const hybridParser = new HybridTextParserService();
const platformSearch = new RealPlatformSearchService();

// POST /api/search/text - Parse natural text and search for products
router.post('/text', [
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

    const { text, options = {} } = req.body;
    
    // Step 1: Parse the user's text
    logger.info(`Parsing user text: "${text}"`);
    const parsedQuery = await hybridParser.parseUserText(text);
    
    // Step 2: Search all platforms based on parsed query
    logger.info(`Searching platforms for: ${parsedQuery.productType}`);
    const searchResults = await platformSearch.searchAllPlatforms(parsedQuery);
    
    // Step 3: Generate recommendations based on results
    const recommendations = generateRecommendations(searchResults, parsedQuery);
    
    // Step 4: Return comprehensive results
    const response = {
      success: true,
      originalText: text,
      parsedQuery,
      searchResults,
      recommendations,
      timestamp: new Date().toISOString()
    };

    logger.info(`Search completed for "${text}" - Found ${searchResults.summary.totalProducts} products`);
    res.json(response);
    
  } catch (error) {
    logger.error('Text search failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

// GET /api/search/products - Direct product search (alternative to text parsing)
router.get('/products', async (req, res) => {
  try {
    const { 
      query, 
      category, 
      minPrice, 
      maxPrice, 
      brand, 
      features,
      platforms = 'amazon,shopify,ebay,walmart',
      limit = 20 
    } = req.query;

    // Build parsed query object
    const parsedQuery = {
      productType: query || 'product',
      category: category || 'general',
      priceRange: {
        min: minPrice ? parseFloat(minPrice) : 0,
        max: maxPrice ? parseFloat(maxPrice) : null
      },
      brands: brand ? [brand] : [],
      features: features ? features.split(',') : [],
      keywords: query ? query.split(' ') : []
    };

    // Search specified platforms
    const platformList = platforms.split(',');
    const searchResults = await platformSearch.searchAllPlatforms(parsedQuery);

    // Filter results by requested platforms
    const filteredResults = {
      ...searchResults,
      platforms: {}
    };

    platformList.forEach(platform => {
      if (searchResults.platforms[platform]) {
        filteredResults.platforms[platform] = searchResults.platforms[platform];
      }
    });

    // Regenerate best deals from filtered results
    filteredResults.bestDeals = platformSearch.findBestDeals(filteredResults.platforms, parsedQuery);

    res.json({
      success: true,
      query: req.query,
      searchResults: filteredResults
    });

  } catch (error) {
    logger.error('Product search failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Product search failed', 
      message: error.message 
    });
  }
});

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Mock suggestions (replace with real implementation)
    const suggestions = [
      `${query} wireless`,
      `${query} bluetooth`,
      `${query} premium`,
      `${query} affordable`,
      `best ${query}`,
      `${query} deals`
    ];

    res.json({ suggestions });

  } catch (error) {
    logger.error('Suggestions failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Suggestions failed' 
    });
  }
});

// Helper function to generate recommendations
function generateRecommendations(searchResults, parsedQuery) {
  const recommendations = {
    bestValue: [],
    premium: [],
    budget: [],
    popular: []
  };

  const allProducts = searchResults.bestDeals || [];

  // Best value (good rating, reasonable price)
  recommendations.bestValue = allProducts
    .filter(p => p.rating >= 4.0 && p.price <= (parsedQuery.priceRange.max || 200))
    .slice(0, 3);

  // Premium (high price, high rating)
  recommendations.premium = allProducts
    .filter(p => p.rating >= 4.5 && p.price > 100)
    .slice(0, 3);

  // Budget (low price, decent rating)
  recommendations.budget = allProducts
    .filter(p => p.price <= 50 && p.rating >= 3.5)
    .slice(0, 3);

  // Popular (high review count)
  recommendations.popular = [...allProducts]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 3);

  return recommendations;
}

module.exports = router;
