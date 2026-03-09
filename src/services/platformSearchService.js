const axios = require('axios');
const logger = require('../utils/logger');

class PlatformSearchService {
  constructor() {
    this.platforms = {
      amazon: new AmazonSearchService(),
      shopify: new ShopifySearchService(),
      ebay: new EbaySearchService(),
      walmart: new WalmartSearchService()
    };
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
          const platformResults = await this.platforms[platform].search(query, parsedQuery);
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

// Individual platform search services
class AmazonSearchService {
  async search(query, parsedQuery) {
    try {
      // Mock Amazon API call (replace with real implementation)
      logger.info(`Searching Amazon for: ${query}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock response
      return {
        platform: 'amazon',
        products: this.generateMockProducts('amazon', query, 5),
        totalCount: 5,
        searchUrl: `https://amazon.com/s?k=${encodeURIComponent(query)}`
      };
    } catch (error) {
      throw new Error(`Amazon search failed: ${error.message}`);
    }
  }

  generateMockProducts(platform, query, count) {
    const products = [];
    const basePrice = Math.random() * 100 + 20;

    for (let i = 0; i < count; i++) {
      products.push({
        id: `${platform}_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - ${platform} Product ${i + 1}`,
        price: basePrice + (Math.random() * 50 - 25),
        rating: 3 + Math.random() * 2,
        reviewCount: Math.floor(Math.random() * 1000),
        platform,
        url: `https://amazon.com/dp/${platform}_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=${platform}+${i + 1}`,
        features: ['wireless', 'bluetooth', 'noise cancelling'],
        availability: Math.random() > 0.2
      });
    }

    return products;
  }
}

class ShopifySearchService {
  async search(query, parsedQuery) {
    try {
      logger.info(`Searching Shopify stores for: ${query}`);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return {
        platform: 'shopify',
        products: this.generateMockProducts('shopify', query, 4),
        totalCount: 4,
        searchUrl: `https://shopify.com/search?q=${encodeURIComponent(query)}`
      };
    } catch (error) {
      throw new Error(`Shopify search failed: ${error.message}`);
    }
  }

  generateMockProducts(platform, query, count) {
    const products = [];
    const basePrice = Math.random() * 80 + 30;

    for (let i = 0; i < count; i++) {
      products.push({
        id: `${platform}_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - ${platform} Store ${i + 1}`,
        price: basePrice + (Math.random() * 40 - 20),
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 500),
        platform,
        url: `https://store.shopify.com/products/${platform}_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=${platform}+${i + 1}`,
        features: ['portable', 'lightweight'],
        availability: Math.random() > 0.1
      });
    }

    return products;
  }
}

class EbaySearchService {
  async search(query, parsedQuery) {
    try {
      logger.info(`Searching eBay for: ${query}`);
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      return {
        platform: 'ebay',
        products: this.generateMockProducts('ebay', query, 6),
        totalCount: 6,
        searchUrl: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`
      };
    } catch (error) {
      throw new Error(`eBay search failed: ${error.message}`);
    }
  }

  generateMockProducts(platform, query, count) {
    const products = [];
    const basePrice = Math.random() * 60 + 10;

    for (let i = 0; i < count; i++) {
      products.push({
        id: `${platform}_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - ${platform} Listing ${i + 1}`,
        price: basePrice + (Math.random() * 30 - 15),
        rating: 3 + Math.random() * 2,
        reviewCount: Math.floor(Math.random() * 800),
        platform,
        url: `https://ebay.com/itm/${platform}_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=${platform}+${i + 1}`,
        features: ['used', 'new condition'].filter(() => Math.random() > 0.5),
        availability: Math.random() > 0.3
      });
    }

    return products;
  }
}

class WalmartSearchService {
  async search(query, parsedQuery) {
    try {
      logger.info(`Searching Walmart for: ${query}`);
      
      await new Promise(resolve => setTimeout(resolve, 550));
      
      return {
        platform: 'walmart',
        products: this.generateMockProducts('walmart', query, 4),
        totalCount: 4,
        searchUrl: `https://walmart.com/search?q=${encodeURIComponent(query)}`
      };
    } catch (error) {
      throw new Error(`Walmart search failed: ${error.message}`);
    }
  }

  generateMockProducts(platform, query, count) {
    const products = [];
    const basePrice = Math.random() * 70 + 25;

    for (let i = 0; i < count; i++) {
      products.push({
        id: `${platform}_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - ${platform} Item ${i + 1}`,
        price: basePrice + (Math.random() * 35 - 17),
        rating: 3.2 + Math.random() * 1.8,
        reviewCount: Math.floor(Math.random() * 600),
        platform,
        url: `https://walmart.com/ip/${platform}_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=${platform}+${i + 1}`,
        features: ['in-store pickup', 'free shipping'],
        availability: Math.random() > 0.15
      });
    }

    return products;
  }
}

module.exports = PlatformSearchService;
