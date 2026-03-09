const request = require('supertest');
const app = require('../src/server');
const logger = require('../src/utils/logger');

// Test configuration
const API_BASE = '/api';
let server;

// Start server before tests
beforeAll(async () => {
  // Start server in test mode
  process.env.NODE_ENV = 'test';
  process.env.SKIP_DB = 'true';
  
  // Wait a moment for server to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Clean up after tests
afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe('AI Commerce Intelligence API Tests', () => {
  
  describe('Health Checks', () => {
    test('GET /health - should return server health', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET / - should return root information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toHaveProperty('name', 'AI Commerce Intelligence API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('API Documentation', () => {
    test('GET /api - should return API documentation', async () => {
      const response = await request(app)
        .get(API_BASE)
        .expect(200);
      
      expect(response.body).toHaveProperty('name', 'AI Commerce Intelligence API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('products');
      expect(response.body.endpoints).toHaveProperty('recommendations');
      expect(response.body.endpoints).toHaveProperty('search');
      expect(response.body.endpoints).toHaveProperty('parser');
    });

    test('GET /api/docs - should return detailed API docs', async () => {
      const response = await request(app)
        .get(`${API_BASE}/docs`)
        .expect(200);
      
      expect(response.body).toHaveProperty('title', 'AI Commerce Intelligence API Documentation');
      expect(response.body).toHaveProperty('endpoints');
      expect(Array.isArray(Object.keys(response.body.endpoints))).toBe(true);
    });
  });

  describe('Text Parser API', () => {
    describe('POST /api/parser/analyze', () => {
      test('should parse simple product text', async () => {
        const response = await request(app)
          .post(`${API_BASE}/parser/analyze`)
          .send({ text: 'I want wireless headphones under $100' })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('originalText');
        expect(response.body).toHaveProperty('parsedQuery');
        expect(response.body).toHaveProperty('processingTime');
        expect(response.body).toHaveProperty('timestamp');
        
        const parsed = response.body.parsedQuery;
        expect(parsed).toHaveProperty('productType');
        expect(parsed).toHaveProperty('category');
        expect(parsed).toHaveProperty('priceRange');
        expect(parsed).toHaveProperty('confidence');
        expect(parsed).toHaveProperty('source');
        expect(parsed.priceRange.max).toBe(100);
      });

      test('should parse complex product text', async () => {
        const response = await request(app)
          .post(`${API_BASE}/parser/analyze`)
          .send({ text: 'Looking for premium gaming laptop with RTX graphics under $2000' })
          .expect(200);
        
        expect(response.body.success).toBe(true);
        const parsed = response.body.parsedQuery;
        expect(parsed.priceRange.max).toBe(2000);
        expect(parsed.quality).toBe('premium');
        expect(parsed.confidence).toBeGreaterThan(0);
      });

      test('should handle text with brand names', async () => {
        const response = await request(app)
          .post(`${API_BASE}/parser/analyze`)
          .send({ text: 'I want Apple iPhone with good camera' })
          .expect(200);
        
        expect(response.body.success).toBe(true);
        const parsed = response.body.parsedQuery;
        expect(parsed.brands).toContain('apple');
      });

      test('should reject invalid text (too short)', async () => {
        const response = await request(app)
          .post(`${API_BASE}/parser/analyze`)
          .send({ text: 'ok' })
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('errors');
      });

      test('should reject empty text', async () => {
        const response = await request(app)
          .post(`${API_BASE}/parser/analyze`)
          .send({ text: '' })
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/parser/stats', () => {
      test('should return parser statistics', async () => {
        const response = await request(app)
          .get(`${API_BASE}/parser/stats`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('parser', 'Hybrid Text Parser');
        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveProperty('mcpAvailable');
        expect(response.body.stats).toHaveProperty('supportedCategories');
        expect(response.body.stats).toHaveProperty('supportedBrands');
      });
    });

    describe('POST /api/parser/compare', () => {
      test('should compare parsing methods', async () => {
        const response = await request(app)
          .post(`${API_BASE}/parser/compare`)
          .send({ text: 'gaming laptop with good graphics' })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('comparison');
        expect(response.body.comparison).toHaveProperty('hybrid');
        expect(response.body.comparison).toHaveProperty('naturalOnly');
        expect(response.body.comparison).toHaveProperty('improvement');
        expect(response.body.comparison).toHaveProperty('recommendation');
      });
    });

    describe('GET /api/parser/test', () => {
      test('should run sample tests', async () => {
        const response = await request(app)
          .get(`${API_BASE}/parser/test`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('sampleResults');
        expect(response.body).toHaveProperty('parserStats');
        expect(Array.isArray(response.body.sampleResults)).toBe(true);
        expect(response.body.sampleResults.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search API', () => {
    describe('POST /api/search/text', () => {
      test('should search products from text', async () => {
        const response = await request(app)
          .post(`${API_BASE}/search/text`)
          .send({ text: 'wireless headphones under $100' })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('originalText');
        expect(response.body).toHaveProperty('parsedQuery');
        expect(response.body).toHaveProperty('searchResults');
        expect(response.body).toHaveProperty('timestamp');
        
        const results = response.body.searchResults;
        expect(results).toHaveProperty('platforms');
        expect(results).toHaveProperty('bestDeals');
        expect(results).toHaveProperty('recommendations');
        expect(results).toHaveProperty('summary');
        
        expect(Array.isArray(results.bestDeals)).toBe(true);
        expect(results.bestDeals.length).toBeGreaterThan(0);
      });

      test('should handle complex search queries', async () => {
        const response = await request(app)
          .post(`${API_BASE}/search/text`)
          .send({ text: 'premium smartphone with best camera' })
          .expect(200);
        
        expect(response.body.success).toBe(true);
        const parsed = response.body.parsedQuery;
        expect(parsed.quality).toBe('premium');
        expect(parsed.productType).toBe('smartphone');
      });

      test('should reject invalid search text', async () => {
        const response = await request(app)
          .post(`${API_BASE}/search/text`)
          .send({ text: 'hi' })
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/search/products', () => {
      test('should search products directly', async () => {
        const response = await request(app)
          .get(`${API_BASE}/search/products`)
          .query({ q: 'laptop', category: 'electronics', maxPrice: '1500' })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('searchResults');
        expect(response.body.searchResults).toHaveProperty('platforms');
      });

      test('should handle missing query parameters', async () => {
        const response = await request(app)
          .get(`${API_BASE}/search/products`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('GET /api/search/suggestions', () => {
      test('should return search suggestions', async () => {
        const response = await request(app)
          .get(`${API_BASE}/search/suggestions`)
          .query({ q: 'lap' })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('suggestions');
        expect(Array.isArray(response.body.suggestions)).toBe(true);
      });
    });
  });

  describe('Products API', () => {
    describe('GET /api/products', () => {
      test('should get products list', async () => {
        const response = await request(app)
          .get(`${API_BASE}/products`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('products');
        expect(Array.isArray(response.body.products)).toBe(true);
      });
    });

    describe('POST /api/products', () => {
      test('should create new product', async () => {
        const product = {
          title: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          category: 'electronics',
          brand: 'TestBrand'
        };

        const response = await request(app)
          .post(`${API_BASE}/products`)
          .send(product)
          .expect(201);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('product');
        expect(response.body.product.title).toBe(product.title);
      });

      test('should reject invalid product data', async () => {
        const response = await request(app)
          .post(`${API_BASE}/products`)
          .send({ title: '' }) // Invalid - missing required fields
          .expect(400);
        
        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Recommendations API', () => {
    describe('GET /api/recommendations', () => {
      test('should get recommendations', async () => {
        const response = await request(app)
          .get(`${API_BASE}/recommendations`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.recommendations)).toBe(true);
      });
    });

    describe('POST /api/recommendations', () => {
      test('should generate new recommendations', async () => {
        const request_body = {
          userId: 'test-user-123',
          preferences: {
            categories: ['electronics'],
            priceRange: { min: 50, max: 500 },
            brands: ['apple', 'samsung']
          }
        };

        const response = await request(app)
          .post(`${API_BASE}/recommendations`)
          .send(request_body)
          .expect(201);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('recommendations');
      });
    });
  });

  describe('Analytics API', () => {
    describe('GET /api/analytics', () => {
      test('should get analytics data', async () => {
        const response = await request(app)
          .get(`${API_BASE}/analytics`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('analytics');
      });
    });

    describe('GET /api/analytics/trends', () => {
      test('should get market trends', async () => {
        const response = await request(app)
          .get(`${API_BASE}/analytics/trends`)
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('trends');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get(`${API_BASE}/non-existent`)
        .expect(404);
    });

    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post(`${API_BASE}/parser/analyze`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('should handle rate limiting after many requests', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 105; i++) { // Over the limit of 100
        requests.push(
          request(app).get(`${API_BASE}/parser/stats`)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should respond to parser analyze within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .post(`${API_BASE}/parser/analyze`)
        .send({ text: 'I want wireless headphones under $100' })
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(app)
          .post(`${API_BASE}/parser/analyze`)
          .send({ text: 'test product search' })
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
