const request = require('supertest');

// Import the app without starting the server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('../src/utils/logger');
const apiRoutes = require('../src/routes/api');

// Create test app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'AI Commerce Intelligence Test Server'
  });
});

describe('Basic API Tests', () => {
  
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
    
    expect(response.body).toHaveProperty('message');
  });

  test('GET /api - should return API documentation', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);
    
    expect(response.body).toHaveProperty('name', 'AI Commerce Intelligence API');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('endpoints');
  });

  test('POST /api/parser/analyze - should parse simple product text', async () => {
    const response = await request(app)
      .post('/api/parser/analyze')
      .send({ text: 'I want wireless headphones under $100' })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('originalText');
    expect(response.body).toHaveProperty('parsedQuery');
    expect(response.body).toHaveProperty('processingTime');
    
    const parsed = response.body.parsedQuery;
    expect(parsed).toHaveProperty('productType');
    expect(parsed).toHaveProperty('category');
    expect(parsed).toHaveProperty('priceRange');
    expect(parsed).toHaveProperty('confidence');
    expect(parsed).toHaveProperty('source');
    expect(parsed.priceRange.max).toBe(100);
  });

  test('POST /api/parser/analyze - should parse complex product text', async () => {
    const response = await request(app)
      .post('/api/parser/analyze')
      .send({ text: 'Looking for premium gaming laptop with RTX graphics under $2000' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    const parsed = response.body.parsedQuery;
    expect(parsed.priceRange.max).toBe(2000);
    expect(parsed.quality).toBe('premium');
    expect(parsed.confidence).toBeGreaterThan(0);
  });

  test('POST /api/parser/analyze - should handle text with brand names', async () => {
    const response = await request(app)
      .post('/api/parser/analyze')
      .send({ text: 'I want Apple iPhone with good camera' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    const parsed = response.body.parsedQuery;
    expect(parsed.brands).toContain('apple');
  });

  test('POST /api/parser/analyze - should reject invalid text (too short)', async () => {
    const response = await request(app)
      .post('/api/parser/analyze')
      .send({ text: 'ok' })
      .expect(400);
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('errors');
  });

  test('GET /api/parser/stats - should return parser statistics', async () => {
    const response = await request(app)
      .get('/api/parser/stats')
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('parser', 'Hybrid Text Parser');
    expect(response.body).toHaveProperty('stats');
    expect(response.body.stats).toHaveProperty('mcpAvailable');
    expect(response.body.stats).toHaveProperty('supportedCategories');
  });

  test('POST /api/parser/compare - should compare parsing methods', async () => {
    const response = await request(app)
      .post('/api/parser/compare')
      .send({ text: 'gaming laptop with good graphics' })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('comparison');
    expect(response.body.comparison).toHaveProperty('hybrid');
    expect(response.body.comparison).toHaveProperty('naturalOnly');
    expect(response.body.comparison).toHaveProperty('improvement');
  });

  test('GET /api/parser/test - should run sample tests', async () => {
    const response = await request(app)
      .get('/api/parser/test')
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('sampleResults');
    expect(Array.isArray(response.body.sampleResults)).toBe(true);
  });

  test('POST /api/search/text - should search products from text', async () => {
    const response = await request(app)
      .post('/api/search/text')
      .send({ text: 'wireless headphones under $100' })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('originalText');
    expect(response.body).toHaveProperty('parsedQuery');
    expect(response.body).toHaveProperty('searchResults');
    
    const results = response.body.searchResults;
    expect(results).toHaveProperty('platforms');
    expect(results).toHaveProperty('bestDeals');
    expect(results).toHaveProperty('recommendations');
    expect(Array.isArray(results.bestDeals)).toBe(true);
  });

  test('POST /api/search/text - should handle complex search queries', async () => {
    const response = await request(app)
      .post('/api/search/text')
      .send({ text: 'premium smartphone with best camera' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    const parsed = response.body.parsedQuery;
    expect(parsed.quality).toBe('premium');
  });

  test('GET /api/search/products - should search products directly', async () => {
    const response = await request(app)
      .get('/api/search/products')
      .query({ q: 'laptop', category: 'electronics', maxPrice: '1500' })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('searchResults');
  });

  test('GET /api/search/suggestions - should return search suggestions', async () => {
    const response = await request(app)
      .get('/api/search/suggestions')
      .query({ q: 'lap' })
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('suggestions');
    expect(Array.isArray(response.body.suggestions)).toBe(true);
  });

  test('GET /api/products - should get products list', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('products');
    expect(Array.isArray(response.body.products)).toBe(true);
  });

  test('POST /api/products - should create new product', async () => {
    const product = {
      title: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      category: 'electronics',
      brand: 'TestBrand'
    };

    const response = await request(app)
      .post('/api/products')
      .send(product)
      .expect(201);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('product');
    expect(response.body.product.title).toBe(product.title);
  });

  test('should handle 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/non-existent')
      .expect(404);
  });

  test('should handle invalid JSON', async () => {
    const response = await request(app)
      .post('/api/parser/analyze')
      .set('Content-Type', 'application/json')
      .send('invalid json')
      .expect(400);
  });

  test('parser performance test', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/api/parser/analyze')
      .send({ text: 'I want wireless headphones under $100' })
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500); // Should complete within 500ms
  });

  test('search performance test', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/api/search/text')
      .send({ text: 'gaming laptop under $1500' })
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
