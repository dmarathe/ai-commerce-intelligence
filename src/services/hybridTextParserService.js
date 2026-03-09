const MCPClientManager = require('./mcpClientManager');
const TextParsingUtils = require('./textParsingUtils');
const logger = require('../utils/logger');

class HybridTextParserService {
  constructor() {
    // Initialize MCP client manager
    this.mcpManager = new MCPClientManager();
    this.mcpAvailable = false;
    
    // Try to initialize MCP clients
    this.initializeMCPClients();
  }

  async initializeMCPClients() {
    try {
      logger.info('Initializing MCP clients...');
      
      // For now, disable MCP servers to avoid startup issues
      // You can enable them later after installing actual MCP servers
      const mcpServers = []; // Disabled for now
      
      if (mcpServers.length > 0) {
        logger.info(`Successfully initialized ${mcpServers.length} MCP servers`);
        this.mcpAvailable = true;
      } else {
        logger.info('MCP servers disabled, using Natural.js fallback');
        this.mcpAvailable = false;
      }
      
    } catch (error) {
      logger.warn('MCP initialization failed, using Natural.js fallback:', error.message);
      this.mcpAvailable = false;
    }
  }

  getMCPConfig(serverName) {
    const configs = {
      'brave-search': {
        apiKey: process.env.BRAVE_API_KEY
      },
      'web-search': {
        engines: 'bing,duckduckgo',
        maxResults: 10
      },
      'entity-extractor': {
        model: 'default'
      },
      'sentiment-analysis': {
        aspects: ['quality', 'price', 'features']
      }
    };
    
    return configs[serverName] || {};
  }

  async parseUserText(userText) {
    const startTime = Date.now();
    
    try {
      let parsed;
      let source;
      
      // Try MCP first if available
      if (this.mcpAvailable) {
        try {
          logger.info('Attempting to parse text with MCP servers...');
          parsed = await this.parseWithMCP(userText);
          source = 'mcp';
          logger.info(`MCP parsing successful in ${Date.now() - startTime}ms`);
        } catch (mcpError) {
          logger.warn(`MCP parsing failed: ${mcpError.message}, falling back to Natural.js`);
          parsed = await this.parseWithNatural(userText);
          source = 'natural_fallback';
        }
      } else {
        logger.info('Using Natural.js for text parsing (no MCP available)');
        parsed = await this.parseWithNatural(userText);
        source = 'natural';
      }
      
      // Add metadata
      parsed.source = source;
      parsed.processingTime = Date.now() - startTime;
      parsed.mcpAvailable = this.mcpAvailable;
      
      return parsed;
      
    } catch (error) {
      logger.error('All parsing methods failed:', error);
      throw new Error(`Text parsing failed: ${error.message}`);
    }
  }

  async parseWithMCP(userText) {
    if (!this.mcpAvailable || this.mcpClients.size === 0) {
      throw new Error('No MCP clients available');
    }

    const parsed = {
      originalText: userText,
      productType: null,
      category: null,
      priceRange: { min: 0, max: null },
      brands: [],
      features: [],
      quality: null,
      keywords: [],
      confidence: 0
    };

    try {
      // Step 1: Use MCP for text analysis
      const analysisResults = await this.performMCPAnalysis(userText);
      
      // Step 2: Use MCP for entity extraction
      const entityResults = await this.extractMCPEntities(userText);
      
      // Step 3: Use MCP for sentiment/quality analysis
      const sentimentResults = await this.analyzeMCPSentiment(userText);
      
      // Combine MCP results
      parsed.productType = analysisResults.productType || entityResults.productType;
      parsed.category = analysisResults.category || 'general';
      parsed.priceRange = entityResults.priceRange || { min: 0, max: null };
      parsed.brands = entityResults.brands || [];
      parsed.features = entityResults.features || [];
      parsed.quality = sentimentResults.quality || 'standard';
      parsed.keywords = analysisResults.keywords || [];
      
      // Calculate confidence based on MCP results
      parsed.confidence = this.calculateMCPConfidence(analysisResults, entityResults, sentimentResults);
      
      return parsed;
      
    } catch (error) {
      logger.error('MCP parsing error:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  async performMCPAnalysis(userText) {
    try {
      // Use MCP text analysis if available
      const availableClients = this.mcpManager.getAvailableClients();
      
      // Try brave-search first for text analysis
      if (availableClients.clients.includes('brave-search')) {
        const client = this.mcpManager.clients.get('brave-search');
        
        // Use MCP to analyze text
        const analysis = await client.call('analyze_text', {
          text: userText,
          context: 'product_search'
        });
        
        return {
          productType: analysis.entities?.product?.[0]?.value || null,
          category: analysis.category || 'general',
          keywords: analysis.keywords || []
        };
      }
      
      // Fallback: Use web search MCP to get context
      if (availableClients.clients.includes('web-search')) {
        const client = this.mcpManager.clients.get('web-search');
        
        const searchResults = await client.call('search', {
          query: `product category "${userText}"`,
          count: 3
        });
        
        return this.extractFromSearchResults(searchResults, userText);
      }
      
      return {};
    } catch (error) {
      logger.error('MCP text analysis failed:', error);
      return {};
    }
  }

  async extractMCPEntities(userText) {
    try {
      // Use MCP entity extraction if available
      const availableClients = this.mcpManager.getAvailableClients();
      
      if (availableClients.clients.includes('entity-extractor')) {
        const client = this.mcpManager.clients.get('entity-extractor');
        
        const entities = await client.call('extract_entities', {
          text: userText,
          entity_types: ['product', 'brand', 'price', 'feature']
        });
        
        return {
          productType: entities.entities?.product?.[0]?.value || null,
          brands: entities.entities?.brand || [],
          priceRange: this.extractPriceFromEntities(entities.entities?.price || []),
          features: entities.entities?.feature || []
        };
      }
      
      return this.extractEntitiesManually(userText);
    } catch (error) {
      logger.error('MCP entity extraction failed:', error);
      return this.extractEntitiesManually(userText);
    }
  }

  extractEntitiesManually(userText) {
    return TextParsingUtils.extractEntitiesManually(userText);
  }

  async analyzeMCPSentiment(userText) {
    try {
      // Use MCP sentiment analysis if available
      const availableClients = this.mcpManager.getAvailableClients();
      
      if (availableClients.clients.includes('sentiment-analysis')) {
        const client = this.mcpManager.clients.get('sentiment-analysis');
        
        const sentiment = await client.call('analyze_sentiment', {
          text: userText,
          aspects: ['quality', 'price', 'features']
        });
        
        return {
          quality: this.determineQualityFromSentiment(sentiment),
          sentiment: sentiment.sentiment.overall
        };
      }
      
      return { quality: 'standard', sentiment: 'neutral' };
    } catch (error) {
      logger.error('MCP sentiment analysis failed:', error);
      return { quality: 'standard', sentiment: 'neutral' };
    }
  }

  async parseWithNatural(userText) {
    // This is the original Natural.js implementation
    const parsed = {
      originalText: userText,
      productType: null,
      category: null,
      priceRange: { min: 0, max: null },
      brands: [],
      features: [],
      quality: null,
      keywords: [],
      confidence: 0
    };

    try {
      // Use TextParsingUtils for better extraction
      const entities = TextParsingUtils.extractEntitiesManually(userText);
      
      parsed.productType = entities.productType;
      parsed.category = TextParsingUtils.determineCategory(entities.productType, TextParsingUtils.extractKeywords(userText));
      parsed.priceRange = entities.priceRange;
      parsed.brands = entities.brands;
      parsed.features = entities.features;
      parsed.quality = TextParsingUtils.determineQuality(userText);
      parsed.keywords = TextParsingUtils.extractKeywords(userText);

      // Calculate confidence score
      parsed.confidence = TextParsingUtils.calculateConfidence(entities);

      return parsed;
    } catch (error) {
      throw new Error(`Natural.js parsing failed: ${error.message}`);
    }
  }


  // MCP-specific methods
  calculateMCPConfidence(analysis, entities, sentiment) {
    let confidence = 0;
    
    // Higher confidence for MCP results
    if (analysis.productType) confidence += 0.5;
    if (analysis.category && analysis.category !== 'general') confidence += 0.25;
    if (entities.priceRange.max) confidence += 0.15;
    if (entities.brands.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }


  // Method to get parsing statistics
  async getParserStats() {
    const mcpStats = this.mcpManager.getAvailableClients();
    
    return {
      mcpAvailable: this.mcpAvailable,
      mcpClients: mcpStats.clients,
      mcpCapabilities: mcpStats.capabilities,
      fallbackMethod: 'natural',
      supportedCategories: Object.keys(this.categories),
      supportedBrands: this.brands.length,
      supportedFeatures: 8,
      health: await this.mcpManager.healthCheck()
    };
  }

  extractFromSearchResults(searchResults, originalText) {
    return TextParsingUtils.extractFromSearchResults(searchResults, originalText);
  }

  extractProductType(text) {
    return TextParsingUtils.extractProductType(text);
  }

  async shutdown() {
    logger.info('Shutting down Hybrid Text Parser...');
    await this.mcpManager.closeAllClients();
  }
}

module.exports = HybridTextParserService;
