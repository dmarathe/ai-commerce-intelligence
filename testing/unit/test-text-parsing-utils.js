const TextParsingUtils = require('./src/services/textParsingUtils');
const HybridTextParserService = require('./src/services/hybridTextParserService');

async function testTextParsingUtils() {
  console.log('🧪 Testing TextParsingUtils');
  console.log('==============================');

  // Test 1: Manual Entity Extraction
  console.log('\n📝 Test 1: Manual Entity Extraction');
  const testTexts = [
    'I want Sony wireless headphones under $100',
    'Looking for premium Apple laptop between $800 and $1200',
    'Need affordable Nike running shoes below $50',
    'Best professional camera with waterproof features'
  ];

  testTexts.forEach((text, index) => {
    console.log(`\n${index + 1}. "${text}"`);
    const entities = TextParsingUtils.extractEntitiesManually(text);
    console.log(`   Product Type: ${entities.productType}`);
    console.log(`   Brands: [${entities.brands.join(', ')}]`);
    console.log(`   Features: [${entities.features.join(', ')}]`);
    console.log(`   Price Range: $${entities.priceRange.min} - $${entities.priceRange.max}`);
  });

  // Test 2: Price Extraction
  console.log('\n💰 Test 2: Price Extraction');
  const priceTests = [
    'under $100',
    'between $50 and $200',
    'from $300 to $500',
    'below $75',
    '$150 dollars',
    'less than $80'
  ];

  priceTests.forEach((priceText, index) => {
    console.log(`\n${index + 1}. "${priceText}"`);
    const priceInfo = TextParsingUtils.extractPriceFromText(priceText);
    console.log(`   Has Price: ${priceInfo.hasPrice}`);
    console.log(`   Range: $${priceInfo.range.min} - $${priceInfo.range.max}`);
  });

  // Test 3: Quality Determination
  console.log('\n⭐ Test 3: Quality Determination');
  const qualityTests = [
    'I want premium quality laptop',
    'Need affordable budget phone',
    'Looking for standard headphones',
    'Best professional camera equipment'
  ];

  qualityTests.forEach((qualityText, index) => {
    console.log(`\n${index + 1}. "${qualityText}"`);
    const quality = TextParsingUtils.determineQuality(qualityText);
    console.log(`   Quality: ${quality}`);
  });

  // Test 4: Category Determination
  console.log('\n📂 Test 4: Category Determination');
  const categoryTests = [
    { productType: 'laptop', keywords: ['computer', 'tech'] },
    { productType: 'shoes', keywords: ['running', 'sport'] },
    { productType: 'camera', keywords: ['photo', 'digital'] },
    { productType: null, keywords: ['furniture', 'home'] }
  ];

  categoryTests.forEach((test, index) => {
    console.log(`\n${index + 1}. Product: ${test.productType}, Keywords: [${test.keywords.join(', ')}]`);
    const category = TextParsingUtils.determineCategory(test.productType, test.keywords);
    console.log(`   Category: ${category}`);
  });

  // Test 5: Confidence Calculation
  console.log('\n📊 Test 5: Confidence Calculation');
  const confidenceTests = [
    {
      productType: 'laptop',
      brands: ['apple'],
      features: ['wireless'],
      priceRange: { min: 0, max: 1000 },
      quality: 'premium'
    },
    {
      productType: null,
      brands: [],
      features: [],
      priceRange: { min: 0, max: null },
      quality: 'standard'
    }
  ];

  confidenceTests.forEach((test, index) => {
    console.log(`\n${index + 1}. Test Data`);
    const confidence = TextParsingUtils.calculateConfidence(test);
    console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
  });

  // Test 6: Integration with Hybrid Parser
  console.log('\n🔄 Test 6: Integration with Hybrid Parser');
  const hybridParser = new HybridTextParserService();
  
  try {
    const testQuery = 'I want Sony wireless headphones under $100 with good quality';
    console.log(`\nQuery: "${testQuery}"`);
    
    const result = await hybridParser.parseUserText(testQuery);
    console.log(`✅ Hybrid Parser Result:`);
    console.log(`   Product Type: ${result.productType}`);
    console.log(`   Category: ${result.category}`);
    console.log(`   Brands: [${result.brands.join(', ')}]`);
    console.log(`   Features: [${result.features.join(', ')}]`);
    console.log(`   Quality: ${result.quality}`);
    console.log(`   Price Range: $${result.priceRange.min} - $${result.priceRange.max}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Source: ${result.source}`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    
  } catch (error) {
    console.log('❌ Hybrid Parser Test Failed:', error.message);
  }

  console.log('\n🎉 TextParsingUtils Test Complete!');
  console.log('=====================================');
}

// Run tests
testTextParsingUtils().catch(console.error);
