const RealApiService = require('./realApiService');
const logger = require('../utils/logger');

class RealPlatformSearchService {
  constructor() {
    this.apiService = new RealApiService();
  }

  async searchAllPlatforms(parsedQuery) {
    const results = {
      query: parsedQuery,
      platforms: {},
      bestDeals: [],
      summary: {
        totalProducts: 0,
        priceRange: { min: null, max: null },
        platforms: []
      }
    };

    try {
      // Generate platform-specific queries
      const queries = this.generatePlatformQueries(parsedQuery);

      // Search all platforms in parallel
      const searchPromises = Object.entries(queries).map(async ([platform, query]) => {
        try {
          const platformResults = await this.searchPlatform(platform, query, parsedQuery);
          results.platforms[platform] = platformResults;
          
          // Update summary
          results.summary.totalProducts += platformResults.products.length;
          results.summary.platforms.push(platform);
          
          return platformResults;
        } catch (error) {
          logger.error(`Search failed for ${platform}:`, error);
          results.platforms[platform] = { products: [], error: error.message };
          return null;
        }
      });

      // Wait for all searches to complete
      const searchResults = await Promise.allSettled(searchPromises);

      // Find best deals across all platforms
      results.bestDeals = this.findBestDeals(results.platforms, parsedQuery);

      // Calculate overall price range
      this.updatePriceRange(results.summary, results.platforms);

      return results;
    } catch (error) {
      logger.error('Platform search failed:', error);
      throw new Error(`Platform search failed: ${error.message}`);
    }
  }

  async searchPlatform(platform, query, parsedQuery) {
    switch (platform) {
      case 'amazon':
        return await this.apiService.searchAmazon(query, parsedQuery);
      case 'ebay':
        return await this.apiService.searchEbay(query, parsedQuery);
      case 'walmart':
        return await this.apiService.searchWalmart(query, parsedQuery);
      case 'shopify':
        return await this.apiService.searchShopify(query, parsedQuery);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  generatePlatformQueries(parsedQuery) {
    const queries = {};
    
    // Base query from parsed text
    const baseTerms = [
      parsedQuery.productType,
      ...(parsedQuery.brands || []),
      ...(parsedQuery.features || [])
    ].filter(Boolean);

    queries.amazon = baseTerms.join(' ');
    queries.shopify = baseTerms.join(' ');
    queries.ebay = baseTerms.join(' ');
    queries.walmart = baseTerms.join(' ');

    return queries;
  }

  findBestDeals(platformResults, parsedQuery) {
    const allProducts = [];

    // Collect all products from all platforms
    Object.values(platformResults).forEach(platform => {
      if (platform.products && Array.isArray(platform.products)) {
        allProducts.push(...platform.products);
      }
    });

    // Filter by price range if specified
    let filteredProducts = allProducts;
    if (parsedQuery.priceRange && parsedQuery.priceRange.max) {
      filteredProducts = allProducts.filter(product => 
        product.price <= parsedQuery.priceRange.max
      );
    }

    // Sort by price (ascending for best deals)
    filteredProducts.sort((a, b) => a.price - b.price);

    // Calculate deal scores
    filteredProducts = filteredProducts.map(product => ({
      ...product,
      dealScore: this.calculateDealScore(product, parsedQuery)
    }));

    // Sort by deal score
    filteredProducts.sort((a, b) => b.dealScore - a.dealScore);

    return filteredProducts.slice(0, 10); // Top 10 best deals
  }

  calculateDealScore(product, parsedQuery) {
    let score = 0;

    // Price factor (lower is better)
    if (parsedQuery.priceRange.max) {
      const priceRatio = product.price / parsedQuery.priceRange.max;
      score += (1 - priceRatio) * 0.4; // 40% weight
    }

    // Rating factor
    if (product.rating) {
      score += (product.rating / 5) * 0.3; // 30% weight
    }

    // Review count factor
    if (product.reviewCount) {
      const reviewScore = Math.min(product.reviewCount / 100, 1);
      score += reviewScore * 0.2; // 20% weight
    }

    // Feature matching
    if (parsedQuery.features && product.features) {
      const featureMatches = parsedQuery.features.filter(feature => 
        product.features.some(prodFeature => 
          prodFeature.toLowerCase().includes(feature.toLowerCase())
        )
      );
      score += (featureMatches.length / parsedQuery.features.length) * 0.1; // 10% weight
    }

    // Platform-specific bonuses
    if (product.platform === 'amazon' && product.primeEligible) {
      score += 0.05; // 5% bonus for Prime
    }

    if (product.platform === 'walmart' && product.inStorePickup) {
      score += 0.03; // 3% bonus for in-store pickup
    }

    if (product.platform === 'ebay' && product.condition === 'New') {
      score += 0.02; // 2% bonus for new condition
    }

    return score;
  }

  updatePriceRange(summary, platforms) {
    const allPrices = [];

    Object.values(platforms).forEach(platform => {
      if (platform.products && Array.isArray(platform.products)) {
        platform.products.forEach(product => {
          if (product.price && typeof product.price === 'number') {
            allPrices.push(product.price);
          }
        });
      }
    });

    if (allPrices.length > 0) {
      summary.priceRange.min = Math.min(...allPrices);
      summary.priceRange.max = Math.max(...allPrices);
    }
  }
}

module.exports = RealPlatformSearchService;
