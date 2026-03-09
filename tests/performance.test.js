const request = require('supertest');
const app = require('../src/server');

describe('Performance Tests', () => {
  
  describe('Response Time Tests', () => {
    test('parser analyze should respond within 500ms', async () => {
      const start = Date.now();
      
      await request(app)
        .post('/api/parser/analyze')
        .send({ text: 'wireless headphones under $100' })
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    test('search text should respond within 1000ms', async () => {
      const start = Date.now();
      
      await request(app)
        .post('/api/search/text')
        .send({ text: 'gaming laptop under $1500' })
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    test('simple endpoints should respond within 100ms', async () => {
      const endpoints = [
        '/health',
        '/api',
        '/api/parser/stats',
        '/api/products'
      ];

      for (const endpoint of endpoints) {
        const start = Date.now();
        
        await request(app)
          .get(endpoint)
          .expect(200);
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100);
      }
    });
  });

  describe('Load Tests', () => {
    test('should handle 50 concurrent parser requests', async () => {
      const requests = Array(50).fill().map((_, index) =>
        request(app)
          .post('/api/parser/analyze')
          .send({ text: `test product ${index} under $100` })
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 50 requests
    });

    test('should handle 20 concurrent search requests', async () => {
      const requests = Array(20).fill().map((_, index) =>
        request(app)
          .post('/api/search/text')
          .send({ text: `laptop model ${index} under $1000` })
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.searchResults).toBeDefined();
      });
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(8000); // 8 seconds for 20 search requests
    });

    test('should handle mixed concurrent requests', async () => {
      const requests = [
        // Parser requests
        ...Array(10).fill().map((_, index) =>
          request(app)
            .post('/api/parser/analyze')
            .send({ text: `product ${index}` })
        ),
        // Search requests
        ...Array(5).fill().map((_, index) =>
          request(app)
            .post('/api/search/text')
            .send({ text: `search ${index}` })
        ),
        // GET requests
        ...Array(10).fill().map(() =>
          request(app).get('/api/parser/stats')
        )
      ];
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds for 25 mixed requests
    });
  });

  describe('Memory and Resource Tests', () => {
    test('should handle large text input efficiently', async () => {
      const largeText = 'I want '.repeat(1000) + 'premium wireless headphones under $100 with excellent sound quality and noise cancellation';
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/parser/analyze')
        .send({ text: largeText })
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000);
    });

    test('should handle complex search queries efficiently', async () => {
      const complexText = 'I want the best professional gaming laptop with RTX 4090 graphics card, 32GB RAM, 1TB SSD, 4K display, excellent cooling system, RGB lighting, mechanical keyboard, premium warranty, under $3000 from top brands like ASUS or MSI';
      
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/search/text')
        .send({ text: complexText })
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(response.body.success).toBe(true);
      expect(response.body.searchResults).toBeDefined();
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Stress Tests', () => {
    test('should maintain performance under sustained load', async () => {
      const batches = 5;
      const requestsPerBatch = 20;
      
      for (let batch = 0; batch < batches; batch++) {
        const requests = Array(requestsPerBatch).fill().map((_, index) =>
          request(app)
            .post('/api/parser/analyze')
            .send({ text: `batch ${batch} item ${index} under $50` })
        );
        
        const start = Date.now();
        const responses = await Promise.all(requests);
        const duration = Date.now() - start;
        
        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });
        
        // Performance should remain consistent
        expect(duration).toBeLessThan(3000); // 3 seconds per batch
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    test('should handle rapid sequential requests', async () => {
      const requestCount = 100;
      const times = [];
      
      for (let i = 0; i < requestCount; i++) {
        const start = Date.now();
        
        await request(app)
          .post('/api/parser/analyze')
          .send({ text: `sequential request ${i}` })
          .expect(200);
        
        times.push(Date.now() - start);
      }
      
      // Calculate performance metrics
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(200); // Average under 200ms
      expect(maxTime).toBeLessThan(1000); // Max under 1 second
    });
  });

  describe('Scalability Tests', () => {
    test('should scale with increasing text complexity', async () => {
      const complexities = [
        'laptop',
        'gaming laptop',
        'premium gaming laptop with RTX graphics',
        'premium gaming laptop with RTX 4090 graphics, 32GB RAM, 1TB SSD',
        'premium gaming laptop with RTX 4090 graphics, 32GB RAM, 1TB SSD, 4K display, excellent cooling, RGB lighting, mechanical keyboard, premium warranty, under $3000 from top brands like ASUS or MSI with international shipping and extended support'
      ];
      
      const times = [];
      
      for (const text of complexities) {
        const start = Date.now();
        
        await request(app)
          .post('/api/parser/analyze')
          .send({ text })
          .expect(200);
        
        times.push(Date.now() - start);
      }
      
      // Performance should scale reasonably
      // The most complex request shouldn't be more than 10x slower than the simplest
      const simpleTime = times[0];
      const complexTime = times[times.length - 1];
      
      expect(complexTime).toBeLessThan(simpleTime * 10);
    });

    test('should handle multiple simultaneous users', async () => {
      const userCount = 10;
      const requestsPerUser = 5;
      
      const allRequests = [];
      
      for (let user = 0; user < userCount; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          allRequests.push(
            request(app)
              .post('/api/search/text')
              .send({ 
                text: `user ${user} request ${req} wants headphones under $100` 
              })
          );
        }
      }
      
      const start = Date.now();
      const responses = await Promise.all(allRequests);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Should handle 50 concurrent requests efficiently
      expect(duration).toBeLessThan(15000); // 15 seconds for 50 requests
    });
  });

  describe('Resource Efficiency', () => {
    test('should maintain consistent performance over time', async () => {
      const iterations = 20;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        await request(app)
          .post('/api/parser/analyze')
          .send({ text: 'wireless headphones under $100' })
          .expect(200);
        
        times.push(Date.now() - start);
      }
      
      // Performance should be consistent (low variance)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be less than 50% of average
      expect(stdDev).toBeLessThan(avgTime * 0.5);
    });

    test('should recover quickly from errors', async () => {
      // First, make some invalid requests to trigger errors
      await request(app)
        .post('/api/parser/analyze')
        .send({ text: 'hi' })
        .expect(400);
      
      await request(app)
        .post('/api/parser/analyze')
        .send({ text: '' })
        .expect(400);
      
      // Now make valid requests - should still perform well
      const start = Date.now();
      
      await request(app)
        .post('/api/parser/analyze')
        .send({ text: 'premium laptop under $1000' })
        .expect(200);
      
      const duration = Date.now() - start;
      
      // Should recover quickly
      expect(duration).toBeLessThan(500);
    });
  });
});
