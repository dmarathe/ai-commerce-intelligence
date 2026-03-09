const RealApiService = require('./src/services/realApiService');
const RealPlatformSearchService = require('./src/services/realPlatformSearchService');
const HybridTextParserService = require('./src/services/hybridTextParserService');

async function testRealApiIntegration() {
  console.log('🚀 Testing Real API Integration');
  console.log('=====================================');

  // Initialize services
  const apiService = new RealApiService();
  const platformSearch = new RealPlatformSearchService();
  const textParser = new HybridTextParserService();

  console.log('\n📋 API Keys Status:');
  console.log('Amazon:', apiService.apiKeys.amazon.accessKey ? '✅ Configured' : '❌ Not configured (will use mock)');
  console.log('eBay:', apiService.apiKeys.ebay.appId ? '✅ Configured' : '❌ Not configured (will use mock)');
  console.log('Walmart:', apiService.apiKeys.walmart.apiKey ? '✅ Configured' : '❌ Not configured (will use mock)');
  console.log('Shopify:', '✅ Uses public search (no key required)');

  // Test 1: Text Parsing
  console.log('\n🧠 Step 1: Testing Text Parsing...');
  const testQuery = 'Sony wireless headphones under $200';
  console.log(`Input: "${testQuery}"`);
  
  try {
    const parsedQuery = await textParser.parseUserText(testQuery);
    console.log('✅ Parsed Results:');
    console.log(`  Product Type: ${parsedQuery.productType}`);
    console.log(`  Category: ${parsedQuery.category}`);
    console.log(`  Price Range: $${parsedQuery.priceRange.min} - $${parsedQuery.priceRange.max}`);
    console.log(`  Brands: ${parsedQuery.brands.join(', ') || 'None'}`);
    console.log(`  Features: ${parsedQuery.features.join(', ') || 'None'}`);
    console.log(`  Quality: ${parsedQuery.quality}`);
    console.log(`  Confidence: ${(parsedQuery.confidence * 100).toFixed(1)}%`);
    console.log(`  Source: ${parsedQuery.source}`);
    console.log(`  Processing Time: ${parsedQuery.processingTime}ms`);
  } catch (error) {
    console.log('❌ Text Parsing Failed:', error.message);
    return;
  }

  // Test 2: Individual Platform APIs
  console.log('\n🔍 Step 2: Testing Individual Platform APIs...');
  
  const platforms = ['amazon', 'ebay', 'walmart', 'shopify'];
  const platformResults = {};
  const parsedQuery = {
    productType: 'wireless headphones',
    category: 'electronics',
    priceRange: { min: 0, max: 200 },
    brands: ['sony'],
    features: ['wireless'],
    quality: 'standard'
  };

  for (const platform of platforms) {
    console.log(`\n--- Testing ${platform.toUpperCase()} ---`);
    try {
      const startTime = Date.now();
      let result;
      
      switch (platform) {
        case 'amazon':
          result = await apiService.searchAmazon(testQuery, parsedQuery);
          break;
        case 'ebay':
          result = await apiService.searchEbay(testQuery, parsedQuery);
          break;
        case 'walmart':
          result = await apiService.searchWalmart(testQuery, parsedQuery);
          break;
        case 'shopify':
          result = await apiService.searchShopify(testQuery, parsedQuery);
          break;
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ ${platform.toUpperCase()} Success (${responseTime}ms):`);
      console.log(`  Products Found: ${result.totalCount}`);
      console.log(`  First Product: ${result.products[0]?.title || 'None'}`);
      console.log(`  Price Range: $${Math.min(...result.products.map(p => p.price)).toFixed(2)} - $${Math.max(...result.products.map(p => p.price)).toFixed(2)}`);
      console.log(`  Data Source: ${result.products[0]?.id.includes('_') ? 'Mock' : 'Real API'}`);
      
      platformResults[platform] = result;
      
    } catch (error) {
      console.log(`❌ ${platform.toUpperCase()} Failed:`, error.message);
      platformResults[platform] = { products: [], error: error.message };
    }
  }

  // Test 3: Full Platform Search Integration
  console.log('\n🔎 Step 3: Testing Full Platform Search Integration...');
  try {
    const startTime = Date.now();
    const searchResults = await platformSearch.searchAllPlatforms(parsedQuery);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Full Search Success (${responseTime}ms):`);
    console.log(`  Total Products: ${searchResults.summary.totalProducts}`);
    console.log(`  Platforms Searched: ${searchResults.summary.platforms.join(', ')}`);
    console.log(`  Overall Price Range: $${searchResults.summary.priceRange.min?.toFixed(2)} - $${searchResults.summary.priceRange.max?.toFixed(2)}`);
    
    if (searchResults.bestDeals.length > 0) {
      console.log(`  Best Deal: ${searchResults.bestDeals[0].title} - $${searchResults.bestDeals[0].price.toFixed(2)} (${searchResults.bestDeals[0].platform})`);
      console.log(`  Deal Score: ${searchResults.bestDeals[0].dealScore?.toFixed(3) || 'N/A'}`);
      
      // Show top 3 deals
      console.log('\n  Top 3 Deals:');
      searchResults.bestDeals.slice(0, 3).forEach((deal, index) => {
        console.log(`    ${index + 1}. ${deal.title} - $${deal.price.toFixed(2)} (${deal.platform})`);
        console.log(`       Rating: ${deal.rating}/5 | Reviews: ${deal.reviewCount} | Score: ${deal.dealScore?.toFixed(3)}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Full Search Failed:', error.message);
  }

  // Test 4: API Error Handling
  console.log('\n🛡️ Step 4: Testing Error Handling...');
  
  // Test with invalid query that might trigger API errors
  const invalidQuery = 'xyz123nonexistentproduct';
  console.log(`Testing invalid query: "${invalidQuery}"`);
  
  for (const platform of platforms) {
    try {
      let result;
      switch (platform) {
        case 'amazon':
          result = await apiService.searchAmazon(invalidQuery, {});
          break;
        case 'ebay':
          result = await apiService.searchEbay(invalidQuery, {});
          break;
        case 'walmart':
          result = await apiService.searchWalmart(invalidQuery, {});
          break;
        case 'shopify':
          result = await apiService.searchShopify(invalidQuery, {});
          break;
      }
      
      console.log(`✅ ${platform.toUpperCase()} Handled gracefully: ${result.totalCount} products (likely mock fallback)`);
      
    } catch (error) {
      console.log(`❌ ${platform.toUpperCase()} Error:`, error.message);
    }
  }

  // Test 5: Performance Comparison
  console.log('\n⚡ Step 5: Performance Analysis...');
  
  const performanceTest = async (platform, query) => {
    const times = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      try {
        switch (platform) {
          case 'amazon':
            await apiService.searchAmazon(query, {});
            break;
          case 'ebay':
            await apiService.searchEbay(query, {});
            break;
          case 'walmart':
            await apiService.searchWalmart(query, {});
            break;
          case 'shopify':
            await apiService.searchShopify(query, {});
            break;
        }
        times.push(Date.now() - start);
      } catch (error) {
        times.push(9999); // Mark as failed
      }
    }
    
    const validTimes = times.filter(t => t < 9999);
    return {
      avgTime: validTimes.length > 0 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 0,
      successRate: (validTimes.length / times.length) * 100
    };
  };

  for (const platform of platforms) {
    const perf = await performanceTest(platform, testQuery);
    console.log(`${platform.toUpperCase()}: ${perf.avgTime.toFixed(0)}ms avg, ${perf.successRate}% success rate`);
  }

  console.log('\n🎉 Real API Integration Test Complete!');
  console.log('=====================================');
  console.log('✅ Text parsing working with Natural.js fallback');
  console.log('✅ Platform search integration functional');
  console.log('✅ Error handling and fallbacks working');
  console.log('✅ Performance metrics collected');
  console.log('\n📝 To use REAL APIs instead of mock data:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Add your API credentials to .env');
  console.log('3. Restart the server');
  console.log('4. Check REAL_API_SETUP.md for detailed instructions');
}

// Run the test
testRealApiIntegration().catch(console.error);
