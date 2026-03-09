const request = require('supertest');
const app = require('../src/server');

describe('Integration Tests - Complete Workflows', () => {
  
  describe('Complete Text-to-Product Workflow', () => {
    test('should handle full user journey from text to recommendations', async () => {
      // Step 1: Parse user text
      const parseResponse = await request(app)
        .post('/api/parser/analyze')
        .send({ text: 'I want premium wireless headphones with noise cancellation under $200' })
        .expect(200);
      
      expect(parseResponse.body.success).toBe(true);
      const parsedQuery = parseResponse.body.parsedQuery;
      expect(parsedQuery.productType).toBe('headphones');
      expect(parsedQuery.quality).toBe('premium');
      expect(parsedQuery.priceRange.max).toBe(200);
      expect(parsedQuery.features).toContain('wireless');

      // Step 2: Search for products based on parsed query
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: 'I want premium wireless headphones with noise cancellation under $200' })
        .expect(200);
      
      expect(searchResponse.body.success).toBe(true);
      const searchResults = searchResponse.body.searchResults;
      
      // Verify search results structure
      expect(searchResults).toHaveProperty('platforms');
      expect(searchResults).toHaveProperty('bestDeals');
      expect(searchResults).toHaveProperty('recommendations');
      expect(searchResults.bestDeals.length).toBeGreaterThan(0);
      
      // Step 3: Get recommendations based on search
      const recommendationsResponse = await request(app)
        .post('/api/recommendations')
        .send({
          userId: 'integration-test-user',
          preferences: {
            categories: [parsedQuery.category],
            priceRange: parsedQuery.priceRange,
            quality: parsedQuery.quality
          }
        })
        .expect(201);
      
      expect(recommendationsResponse.body.success).toBe(true);
      expect(recommendationsResponse.body.recommendations).toBeDefined();
    });

    test('should handle budget-conscious user journey', async () => {
      const budgetText = 'cheap running shoes under $50';
      
      // Parse budget request
      const parseResponse = await request(app)
        .post('/api/parser/analyze')
        .send({ text: budgetText })
        .expect(200);
      
      expect(parseResponse.body.parsedQuery.quality).toBe('budget');
      
      // Search for budget options
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: budgetText })
        .expect(200);
      
      // Verify budget-focused results
      const recommendations = searchResponse.body.searchResults.recommendations;
      expect(recommendations).toHaveProperty('budget');
      expect(recommendations.budget.length).toBeGreaterThan(0);
      
      // Check that budget recommendations are actually budget-friendly
      recommendations.budget.forEach(product => {
        expect(product.price).toBeLessThan(50);
      });
    });

    test('should handle premium user journey', async () => {
      const premiumText = 'best professional laptop with premium features';
      
      // Parse premium request
      const parseResponse = await request(app)
        .post('/api/parser/analyze')
        .send({ text: premiumText })
        .expect(200);
      
      expect(parseResponse.body.parsedQuery.quality).toBe('premium');
      
      // Search for premium options
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: premiumText })
        .expect(200);
      
      // Verify results contain premium recommendations
      const recommendations = searchResponse.body.searchResults.recommendations;
      expect(recommendations).toHaveProperty('premium');
    });
  });

  describe('Multi-Platform Search Integration', () => {
    test('should search across all platforms consistently', async () => {
      const searchText = 'smartphone under $500';
      
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: searchText })
        .expect(200);
      
      const platforms = searchResponse.body.searchResults.platforms;
      
      // Verify all platforms are included
      expect(platforms).toHaveProperty('amazon');
      expect(platforms).toHaveProperty('ebay');
      expect(platforms).toHaveProperty('walmart');
      expect(platforms).toHaveProperty('shopify');
      
      // Each platform should have results
      Object.values(platforms).forEach(platform => {
        expect(platform.products).toBeDefined();
        expect(Array.isArray(platform.products)).toBe(true);
        expect(platform.products.length).toBeGreaterThan(0);
      });
    });

    test('should handle platform-specific features', async () => {
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: 'gaming laptop' })
        .expect(200);
      
      const platforms = searchResponse.body.searchResults.platforms;
      
      // Amazon should have Prime availability
      if (platforms.amazon) {
        expect(platforms.amazon.products[0]).toHaveProperty('primeEligible');
      }
      
      // Walmart should have in-store pickup
      if (platforms.walmart) {
        expect(platforms.walmart.products[0].features).toContain('in-store pickup');
      }
      
      // eBay should have auction info
      if (platforms.ebay) {
        expect(platforms.ebay.products[0]).toHaveProperty('auctionEnds');
      }
      
      // Shopify should have store info
      if (platforms.shopify) {
        expect(platforms.shopify.products[0]).toHaveProperty('storeName');
      }
    });
  });

  describe('Parser Performance and Accuracy', () => {
    test('should maintain parsing accuracy across different text patterns', async () => {
      const testCases = [
        {
          text: 'Apple iPhone 15 Pro Max with 256GB storage under $1200',
          expectedBrand: 'apple',
          expectedProduct: 'iphone',
          expectedMaxPrice: 1200
        },
        {
          text: 'Nike running shoes size 10 under $80',
          expectedBrand: 'nike',
          expectedProduct: 'shoes',
          expectedMaxPrice: 80
        },
        {
          text: 'Sony wireless headphones with noise cancellation',
          expectedBrand: 'sony',
          expectedProduct: 'headphones',
          expectedFeatures: ['wireless', 'noise_cancelling']
        },
        {
          text: 'Samsung 4K TV 55 inches under $800',
          expectedBrand: 'samsung',
          expectedProduct: 'tv',
          expectedMaxPrice: 800
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/parser/analyze')
          .send({ text: testCase.text })
          .expect(200);
        
        const parsed = response.body.parsedQuery;
        
        if (testCase.expectedBrand) {
          expect(parsed.brands).toContain(testCase.expectedBrand);
        }
        
        if (testCase.expectedProduct) {
          expect(parsed.productType).toBe(testCase.expectedProduct);
        }
        
        if (testCase.expectedMaxPrice) {
          expect(parsed.priceRange.max).toBe(testCase.expectedMaxPrice);
        }
        
        if (testCase.expectedFeatures) {
          testCase.expectedFeatures.forEach(feature => {
            expect(parsed.features).toContain(feature);
          });
        }
      }
    });

    test('should handle edge cases gracefully', async () => {
      const edgeCases = [
        'I want something cheap',
        'best quality product',
        'under $50 only',
        'professional equipment for work',
        'gaming stuff'
      ];

      for (const edgeCase of edgeCases) {
        const response = await request(app)
          .post('/api/parser/analyze')
          .send({ text: edgeCase })
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.parsedQuery).toHaveProperty('confidence');
        expect(response.body.parsedQuery.confidence).toBeGreaterThanOrEqual(0);
        expect(response.body.parsedQuery.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('API Consistency and Standards', () => {
    test('should maintain consistent response format across all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api' },
        { method: 'get', path: '/api/parser/stats' },
        { method: 'get', path: '/api/products' },
        { method: 'get', path: '/api/recommendations' },
        { method: 'get', path: '/api/analytics' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path).expect(200);
        
        // All successful responses should have success: true
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    test('should handle error responses consistently', async () => {
      const errorEndpoints = [
        { method: 'post', path: '/api/parser/analyze', data: { text: 'hi' } },
        { method: 'post', path: '/api/search/text', data: { text: 'hi' } },
        { method: 'post', path: '/api/products', data: {} }
      ];

      for (const endpoint of errorEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path).send(endpoint.data);
        
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body).toHaveProperty('success', false);
        
        if (response.status === 400) {
          expect(response.body).toHaveProperty('errors');
        }
      }
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle holiday shopping scenario', async () => {
      const holidayText = 'Christmas gifts for tech lover under $100';
      
      // Parse holiday shopping request
      const parseResponse = await request(app)
        .post('/api/parser/analyze')
        .send({ text: holidayText })
        .expect(200);
      
      expect(parseResponse.body.parsedQuery.priceRange.max).toBe(100);
      
      // Search for gift ideas
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: holidayText })
        .expect(200);
      
      // Should have budget-friendly recommendations
      const recommendations = searchResponse.body.searchResults.recommendations;
      expect(recommendations.budget.length).toBeGreaterThan(0);
    });

    test('should handle business equipment scenario', async () => {
      const businessText = 'professional office equipment for startup under $5000';
      
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: businessText })
        .expect(200);
      
      const parsed = searchResponse.body.parsedQuery;
      expect(parsed.quality).toBe('professional');
      expect(parsed.priceRange.max).toBe(5000);
    });

    test('should handle student needs scenario', async () => {
      const studentText = 'affordable laptop for online classes under $600';
      
      const searchResponse = await request(app)
        .post('/api/search/text')
        .send({ text: studentText })
        .expect(200);
      
      const parsed = searchResponse.body.parsedQuery;
      expect(parsed.productType).toBe('laptop');
      expect(parsed.quality).toBe('budget');
      expect(parsed.priceRange.max).toBe(600);
    });
  });
});
