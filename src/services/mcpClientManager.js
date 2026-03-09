const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class MCPClientManager {
  constructor() {
    this.clients = new Map();
    this.serverProcesses = new Map();
    this.config = {
      maxRetries: 3,
      timeout: 10000,
      retryDelay: 1000
    };
  }

  async initializeClient(serverName, serverConfig) {
    try {
      logger.info(`Initializing MCP client for: ${serverName}`);
      
      switch (serverName) {
        case 'brave-search':
          return await this.createBraveSearchClient(serverConfig);
        case 'web-search':
          return await this.createWebSearchClient(serverConfig);
        case 'entity-extractor':
          return await this.createEntityExtractorClient(serverConfig);
        case 'sentiment-analysis':
          return await this.createSentimentAnalysisClient(serverConfig);
        default:
          throw new Error(`Unknown MCP server: ${serverName}`);
      }
    } catch (error) {
      logger.error(`Failed to initialize ${serverName}:`, error);
      throw error;
    }
  }

  async createBraveSearchClient(config) {
    try {
      // Check if Brave Search MCP server is available
      const braveSearchPath = this.findMCPExecutable('brave-search');
      
      if (!braveSearchPath) {
        throw new Error('Brave Search MCP server not found. Install with: npm install -g @modelcontextprotocol/server-brave-search');
      }

      // Start the MCP server process
      const process = spawn(braveSearchPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          BRAVE_API_KEY: config.apiKey || process.env.BRAVE_API_KEY
        }
      });

      // Create client interface
      const client = {
        name: 'brave-search',
        process,
        type: 'search',
        capabilities: ['search', 'web_search', 'analyze_text'],
        
        async call(method, params) {
          return await this.sendMCPRequest(process, method, params);
        },

        async close() {
          if (process && !process.killed) {
            process.kill();
          }
        }
      };

      // Handle process events
      process.on('error', (error) => {
        logger.error(`Brave Search MCP process error:`, error);
      });

      process.on('exit', (code) => {
        logger.info(`Brave Search MCP process exited with code: ${code}`);
      });

      // Wait for server to be ready
      await this.waitForServerReady(process);
      
      this.clients.set('brave-search', client);
      this.serverProcesses.set('brave-search', process);
      
      logger.info('Brave Search MCP client initialized successfully');
      return client;

    } catch (error) {
      throw new Error(`Failed to create Brave Search client: ${error.message}`);
    }
  }

  async createWebSearchClient(config) {
    try {
      // Check for open-web-search MCP server
      const webSearchPath = this.findMCPExecutable('open-web-search');
      
      if (!webSearchPath) {
        throw new Error('Open Web Search MCP server not found. Install with: npm install -g @modelcontextprotocol/server-open-web-search');
      }

      const process = spawn(webSearchPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SEARCH_ENGINES: config.engines || 'bing,duckduckgo',
          MAX_RESULTS: config.maxResults || '10'
        }
      });

      const client = {
        name: 'web-search',
        process,
        type: 'search',
        capabilities: ['search', 'multi_engine_search'],
        
        async call(method, params) {
          return await this.sendMCPRequest(process, method, params);
        },

        async close() {
          if (process && !process.killed) {
            process.kill();
          }
        }
      };

      await this.waitForServerReady(process);
      
      this.clients.set('web-search', client);
      this.serverProcesses.set('web-search', process);
      
      logger.info('Web Search MCP client initialized successfully');
      return client;

    } catch (error) {
      throw new Error(`Failed to create Web Search client: ${error.message}`);
    }
  }

  async createEntityExtractorClient(config) {
    try {
      // For entity extraction, we might use a local Python script or external service
      const entityExtractorPath = this.findMCPExecutable('entity-extractor');
      
      if (!entityExtractorPath) {
        // Create a simple entity extractor as fallback
        return this.createSimpleEntityExtractor();
      }

      const process = spawn(entityExtractorPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      const client = {
        name: 'entity-extractor',
        process,
        type: 'nlp',
        capabilities: ['extract_entities', 'analyze_text'],
        
        async call(method, params) {
          return await this.sendMCPRequest(process, method, params);
        },

        async close() {
          if (process && !process.killed) {
            process.kill();
          }
        }
      };

      await this.waitForServerReady(process);
      
      this.clients.set('entity-extractor', client);
      this.serverProcesses.set('entity-extractor', process);
      
      logger.info('Entity Extractor MCP client initialized successfully');
      return client;

    } catch (error) {
      throw new Error(`Failed to create Entity Extractor client: ${error.message}`);
    }
  }

  async createSentimentAnalysisClient(config) {
    try {
      // For sentiment analysis, create a simple client
      return this.createSimpleSentimentAnalyzer();
    } catch (error) {
      throw new Error(`Failed to create Sentiment Analysis client: ${error.message}`);
    }
  }

  createSimpleEntityExtractor() {
    // Simple rule-based entity extractor as fallback
    return {
      name: 'simple-entity-extractor',
      process: null,
      type: 'nlp',
      capabilities: ['extract_entities'],
      
      async call(method, params) {
        if (method === 'extract_entities') {
          const { text, entity_types } = params;
          const entities = {};
          
          const lowerText = text.toLowerCase();
          
          if (entity_types.includes('brand')) {
            // Use centralized brand list from TextParsingUtils
            const TextParsingUtils = require('./textParsingUtils');
            entities.brand = TextParsingUtils.BRANDS.filter(brand => lowerText.includes(brand));
          }
          
          if (entity_types.includes('price')) {
            const pricePattern = /\$(\d+)/g;
            const priceMatch = text.match(pricePattern);
            if (priceMatch) {
              entities.price = [{
                type: 'price',
                value: parseInt(priceMatch[0].replace('$', '')),
                currency: 'USD'
              }];
            }
          }
          
          if (entity_types.includes('product')) {
            const products = ['laptop', 'phone', 'headphone', 'shoes', 'shirt', 'camera', 'tablet'];
            const found = products.find(product => lowerText.includes(product));
            if (found) {
              entities.product = [{
                type: 'product',
                value: found,
                confidence: 0.8
              }];
            }
          }
          
          return { entities, confidence: 0.7 };
        }
        
        throw new Error(`Unknown method: ${method}`);
      },

      async close() {
        // No process to close
      }
    };
  }

  createSimpleSentimentAnalyzer() {
    // Simple rule-based sentiment analyzer
    return {
      name: 'simple-sentiment-analyzer',
      process: null,
      type: 'nlp',
      capabilities: ['analyze_sentiment'],
      
      async call(method, params) {
        if (method === 'analyze_sentiment') {
          const { text, aspects } = params;
          const lowerText = text.toLowerCase();
          
          const sentiment = {
            overall: 'neutral',
            aspects: {}
          };
          
          // Use centralized quality words from TextParsingUtils
          const TextParsingUtils = require('./textParsingUtils');
          const positiveWords = ['best', 'excellent', 'amazing', 'perfect', 'great', 'good'];
          const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'worst'];
          
          const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
          const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
          
          if (positiveCount > negativeCount) {
            sentiment.overall = 'positive';
          } else if (negativeCount > positiveCount) {
            sentiment.overall = 'negative';
          }
          
          if (aspects.includes('quality')) {
            // Use centralized quality detection from TextParsingUtils
            const quality = TextParsingUtils.determineQuality(text);
            
            if (quality === 'budget') {
              sentiment.aspects.quality = { negative: 0.8, positive: 0.2 };
            } else if (quality === 'premium') {
              sentiment.aspects.quality = { negative: 0.1, positive: 0.9 };
            } else {
              sentiment.aspects.quality = { negative: 0.3, positive: 0.7 };
            }
          }
          
          return { sentiment, confidence: 0.6 };
        }
        
        throw new Error(`Unknown method: ${method}`);
      },

      async close() {
        // No process to close
      }
    };
  }

  async sendMCPRequest(process, method, params) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substr(2, 9);
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method,
        params
      };
      
      let responseBuffer = '';
      
      // Send request
      process.stdin.write(JSON.stringify(request) + '\n');
      
      // Set up response handler
      const responseHandler = (data) => {
        responseBuffer += data.toString();
        
        try {
          const lines = responseBuffer.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('{') && line.endsWith('}')) {
              const response = JSON.parse(line);
              if (response.id === requestId) {
                process.stdout.off('data', responseHandler);
                process.stderr.off('data', errorHandler);
                
                if (response.error) {
                  reject(new Error(response.error.message || 'MCP request failed'));
                } else {
                  resolve(response.result);
                }
                return;
              }
            }
          }
        } catch (error) {
          // Not a complete JSON yet, continue accumulating
        }
      };
      
      const errorHandler = (data) => {
        logger.error('MCP process error:', data.toString());
        reject(new Error('MCP process error'));
      };
      
      process.stdout.on('data', responseHandler);
      process.stderr.on('data', errorHandler);
      
      // Timeout
      setTimeout(() => {
        process.stdout.off('data', responseHandler);
        process.stderr.off('data', errorHandler);
        reject(new Error('MCP request timeout'));
      }, this.config.timeout);
    });
  }

  async waitForServerReady(process) {
    return new Promise((resolve, reject) => {
      let readyBuffer = '';
      
      const readyHandler = (data) => {
        readyBuffer += data.toString();
        
        if (readyBuffer.includes('ready') || readyBuffer.includes('initialized')) {
          process.stdout.off('data', readyHandler);
          process.stderr.off('data', errorHandler);
          resolve();
        }
      };
      
      const errorHandler = (data) => {
        logger.error('MCP server startup error:', data.toString());
        reject(new Error('MCP server failed to start'));
      };
      
      process.stdout.on('data', readyHandler);
      process.stderr.on('data', errorHandler);
      
      // Timeout
      setTimeout(() => {
        process.stdout.off('data', readyHandler);
        process.stderr.off('data', errorHandler);
        resolve(); // Assume ready if no explicit ready message
      }, 5000);
    });
  }

  findMCPExecutable(serverName) {
    // Try to find MCP executable in common locations
    const possiblePaths = [
      `/usr/local/bin/${serverName}`,
      `/usr/bin/${serverName}`,
      path.join(process.cwd(), 'node_modules', '.bin', serverName),
      path.join(process.cwd(), 'mcp-servers', serverName),
      `${serverName}` // Assume it's in PATH
    ];
    
    for (const execPath of possiblePaths) {
      try {
        // Check if file exists and is executable
        fs.access(execPath, fs.constants.F_OK);
        return execPath;
      } catch (error) {
        // Continue checking next path
      }
    }
    
    return null;
  }

  async closeAllClients() {
    logger.info('Closing all MCP clients...');
    
    for (const [name, client] of this.clients) {
      try {
        await client.close();
        logger.info(`Closed MCP client: ${name}`);
      } catch (error) {
        logger.error(`Error closing ${name}:`, error);
      }
    }
    
    // Kill all processes
    for (const [name, process] of this.serverProcesses) {
      try {
        if (process && !process.killed) {
          process.kill();
          logger.info(`Killed MCP process: ${name}`);
        }
      } catch (error) {
        logger.error(`Error killing ${name}:`, error);
      }
    }
    
    this.clients.clear();
    this.serverProcesses.clear();
  }

  getAvailableClients() {
    return {
      count: this.clients.size,
      clients: Array.from(this.clients.keys()),
      capabilities: Array.from(this.clients.values()).map(client => ({
        name: client.name,
        type: client.type,
        capabilities: client.capabilities
      }))
    };
  }

  async healthCheck() {
    const health = {
      totalClients: this.clients.size,
      healthyClients: 0,
      unhealthyClients: [],
      details: {}
    };
    
    for (const [name, client] of this.clients) {
      try {
        // Simple ping test
        const start = Date.now();
        await client.call('ping', {});
        const responseTime = Date.now() - start;
        
        health.healthyClients++;
        health.details[name] = {
          status: 'healthy',
          responseTime,
          capabilities: client.capabilities
        };
      } catch (error) {
        health.unhealthyClients.push(name);
        health.details[name] = {
          status: 'unhealthy',
          error: error.message,
          capabilities: client.capabilities
        };
      }
    }
    
    return health;
  }
}

module.exports = MCPClientManager;
