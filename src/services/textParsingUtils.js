const logger = require('../utils/logger');

class TextParsingUtils {
  // Common brand lists
  static BRANDS = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'dell', 'hp', 'lenovo', 'microsoft', 'google'];
  
  // Common feature lists
  static FEATURES = ['wireless', 'bluetooth', 'waterproof', 'portable', 'noise cancelling', 'lightweight', 'compact', 'durable'];
  
  // Product type keywords
  static PRODUCT_KEYWORDS = ['laptop', 'phone', 'headphone', 'shoes', 'shirt', 'camera', 'tablet', 'watch', 'speaker'];
  
  // Quality indicators
  static QUALITY_WORDS = {
    budget: ['cheap', 'affordable', 'budget', 'inexpensive', 'low-cost'],
    standard: ['good', 'decent', 'standard', 'regular'],
    premium: ['premium', 'high-end', 'professional', 'best', 'top', 'luxury', 'quality']
  };

  /**
   * Extract entities manually from text using rule-based approach
   */
  static extractEntitiesManually(text) {
    const entities = {
      productType: null,
      brands: [],
      priceRange: { min: 0, max: null },
      features: []
    };

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    // Extract brands
    entities.brands = words.filter(word => this.BRANDS.includes(word));
    
    // Extract features
    entities.features = words.filter(word => this.FEATURES.includes(word));
    
    // Extract product type
    entities.productType = this.extractProductType(text);
    
    // Extract price
    const priceInfo = this.extractPriceFromText(text);
    if (priceInfo.hasPrice) {
      entities.priceRange = priceInfo.range;
    }
    
    return entities;
  }

  /**
   * Extract product type from text
   */
  static extractProductType(text) {
    const lowerText = text.toLowerCase();
    
    for (const keyword of this.PRODUCT_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return keyword;
      }
    }
    
    return null;
  }

  /**
   * Extract price information from text
   */
  static extractPriceFromText(text) {
    // Multiple price patterns
    const patterns = [
      /\$(\d+(?:\.\d{2})?)/g,           // $100, $99.99
      /(\d+(?:\.\d{2})?)\s*dollars?/gi,  // 100 dollars, 99.99 dollars
      /(\d+(?:\.\d{2})?)\s*usd/gi,     // 100 USD, 99.99 USD
      /under\s*\$(\d+(?:\.\d{2})?)/gi,     // under $100
      /below\s*\$(\d+(?:\.\d{2})?)/gi,     // below $100
      /less\s*than\s*\$(\d+(?:\.\d{2})?)/gi, // less than $100
      /between\s*\$(\d+(?:\.\d{2})?)\s*and\s*\$(\d+(?:\.\d{2})?)/gi, // between $100 and $200
      /from\s*\$(\d+(?:\.\d{2})?)\s*to\s*\$(\d+(?:\.\d{2})?)/gi // from $100 to $200
    ];

    let minPrice = 0;
    let maxPrice = null;
    let hasPrice = false;

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        hasPrice = true;
        
        if (pattern.source.includes('between') || pattern.source.includes('from')) {
          // Range patterns
          const rangeMatch = matches[0].match(/\$(\d+(?:\.\d{2})?)/g);
          if (rangeMatch && rangeMatch.length >= 2) {
            minPrice = parseFloat(rangeMatch[0].replace('$', ''));
            maxPrice = parseFloat(rangeMatch[1].replace('$', ''));
          }
        } else if (pattern.source.includes('under') || pattern.source.includes('below') || pattern.source.includes('less')) {
          // Upper limit patterns
          const priceMatch = matches[0].match(/\$(\d+(?:\.\d{2})?)/);
          if (priceMatch) {
            maxPrice = parseFloat(priceMatch[1]);
          }
        } else {
          // Single price patterns
          const priceMatch = matches[0].match(/\$(\d+(?:\.\d{2})?)/);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (maxPrice === null || price < maxPrice) {
              maxPrice = price;
            }
          }
        }
      }
    }

    return {
      hasPrice,
      range: { min: minPrice, max: maxPrice }
    };
  }

  /**
   * Extract price from entity array
   */
  static extractPriceFromEntities(priceEntities) {
    const prices = priceEntities.map(entity => entity.value || entity);
    const validPrices = prices.filter(price => typeof price === 'number' && price > 0);
    
    if (validPrices.length === 0) {
      return { min: 0, max: null };
    }
    
    return {
      min: Math.min(...validPrices),
      max: Math.max(...validPrices)
    };
  }

  /**
   * Determine quality level from text
   */
  static determineQuality(text) {
    const lowerText = text.toLowerCase();
    
    for (const [quality, words] of Object.entries(this.QUALITY_WORDS)) {
      for (const word of words) {
        if (lowerText.includes(word)) {
          return quality;
        }
      }
    }
    
    return 'standard';
  }

  /**
   * Extract keywords from text
   */
  static extractKeywords(text) {
    // Remove common stop words and split
    const stopWords = ['i', 'want', 'need', 'looking', 'for', 'with', 'and', 'or', 'the', 'a', 'an'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Determine category from product type and keywords
   */
  static determineCategory(productType, keywords) {
    const categoryMap = {
      'laptop': 'electronics',
      'phone': 'electronics',
      'headphone': 'electronics',
      'camera': 'electronics',
      'tablet': 'electronics',
      'watch': 'electronics',
      'speaker': 'electronics',
      'shoes': 'clothing',
      'shirt': 'clothing'
    };
    
    // Primary category from product type
    if (productType && categoryMap[productType]) {
      return categoryMap[productType];
    }
    
    // Fallback to keyword-based categorization
    const keywordCategories = {
      'electronics': ['tech', 'digital', 'electronic', 'device'],
      'clothing': ['wear', 'fashion', 'apparel', 'clothing'],
      'home': ['home', 'kitchen', 'furniture', 'decor'],
      'sports': ['sport', 'fitness', 'exercise', 'outdoor']
    };
    
    for (const [category, categoryKeywords] of Object.entries(keywordCategories)) {
      for (const keyword of keywords) {
        if (categoryKeywords.includes(keyword)) {
          return category;
        }
      }
    }
    
    return 'general';
  }

  /**
   * Calculate confidence score based on available information
   */
  static calculateConfidence(parsedData) {
    let confidence = 0.3; // Base confidence
    
    // Add confidence for each extracted entity
    if (parsedData.productType) confidence += 0.2;
    if (parsedData.brands && parsedData.brands.length > 0) confidence += 0.15;
    if (parsedData.features && parsedData.features.length > 0) confidence += 0.1;
    if (parsedData.priceRange && parsedData.priceRange.max !== null) confidence += 0.15;
    if (parsedData.quality && parsedData.quality !== 'standard') confidence += 0.1;
    
    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Extract information from search results
   */
  static extractFromSearchResults(searchResults, originalText) {
    const keywords = [];
    const category = 'general';
    
    if (searchResults.results && searchResults.results.length > 0) {
      // Extract keywords from search results
      searchResults.results.forEach(result => {
        if (result.title) {
          keywords.push(...result.title.toLowerCase().split(' '));
        }
      });
    }
    
    return {
      productType: this.extractProductType(originalText),
      category,
      keywords: [...new Set(keywords)] // Remove duplicates
    };
  }

  /**
   * Clean and normalize text
   */
  static cleanText(text) {
    return text
      .trim()
      .replace(/[^\w\s$.,!?-]/g, '') // Remove special characters except common punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase();
  }

  /**
   * Validate parsed query data
   */
  static validateParsedQuery(parsedQuery) {
    const errors = [];
    
    if (!parsedQuery.productType && !parsedQuery.keywords.length) {
      errors.push('No product type or keywords found');
    }
    
    if (parsedQuery.priceRange && parsedQuery.priceRange.max && parsedQuery.priceRange.max <= 0) {
      errors.push('Invalid price range');
    }
    
    if (parsedQuery.confidence < 0 || parsedQuery.confidence > 1) {
      errors.push('Invalid confidence score');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TextParsingUtils;
