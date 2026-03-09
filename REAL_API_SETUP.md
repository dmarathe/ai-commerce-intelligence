# Real API Integration Setup Guide

This guide will help you configure your AI Commerce Intelligence system to use real product APIs instead of mock data.

## 🚀 Quick Setup

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure API Keys
Edit the `.env` file with your actual API credentials:

## 🛒 Amazon Product Advertising API

### Get API Credentials:
1. Go to [Amazon Product Advertising API Portal](https://advertising.amazon.com/)
2. Sign in with your Amazon account
3. Create a new application
4. Get your Access Key, Secret Key, and Associate Tag

### Environment Variables:
```bash
AMAZON_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AMAZON_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AMAZON_ASSOCIATE_TAG=yourassocia-20
AMAZON_MARKETPLACE=www.amazon.com
AMAZON_REGION=us-east-1
```

### Rate Limits:
- **Production**: 1 request per second
- **Sandbox**: 1 request per second
- **Maximum**: 8640 requests per day

## 🛍 eBay Finding API

### Get API Credentials:
1. Go to [eBay Developers Program](https://developer.ebay.com/)
2. Create a new application
3. Get your App ID, Cert ID, Dev ID, and Token

### Environment Variables:
```bash
EBAY_APP_ID=YourAppId-1234567890
EBAY_CERT_ID=YourCertId-1234567890
EBAY_DEV_ID=YourDevId-1234567890
EBAY_TOKEN=AgAAAA**YourLongTokenHere**EXAMPLE
EBAY_SANDBOX=true  # Set to false for production
```

### Rate Limits:
- **Sandbox**: 5,000 requests per day
- **Production**: 5,000 requests per day

## 🏪 Walmart Product API

### Get API Credentials:
1. Go to [Walmart Developer Portal](https://developer.walmart.com/)
2. Create a new application
3. Get your API Key

### Environment Variables:
```bash
WALMART_API_KEY=your_walmart_api_key_here
WALMART_API_URL=https://api.walmart.com/v2
```

### Rate Limits:
- **Free Tier**: 1,000 requests per day
- **Premium**: Up to 100,000 requests per day

## 🛍️ Shopify

Shopify uses public search, so no API key is required for basic functionality.

### For Store-Specific Search (Optional):
```bash
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token_here
```

## 🔧 Testing Configuration

### Test with Mock Data (No API Keys Required):
```bash
# Use mock data for testing
npm run dev
```

### Test with Real APIs:
1. Add your API keys to `.env`
2. Restart the server:
```bash
npm run dev
```

### Verify API Integration:
```bash
# Test the search functionality
node manual-test.js
```

## 📊 API Response Examples

### Amazon Real Response:
```json
{
  "platform": "amazon",
  "products": [
    {
      "id": "B08N5M7S4",
      "title": "Sony WH-1000XM4 Wireless Headphones",
      "price": 349.99,
      "rating": 4.7,
      "reviewCount": 15420,
      "platform": "amazon",
      "url": "https://amazon.com/dp/B08N5M7S4",
      "image": "https://m.media-amazon.com/images/I/61...",
      "features": ["wireless", "bluetooth", "noise cancelling"],
      "availability": "In Stock",
      "primeEligible": true
    }
  ],
  "totalCount": 10,
  "searchUrl": "https://amazon.com/s?k=wireless+headphones"
}
```

### eBay Real Response:
```json
{
  "platform": "ebay",
  "products": [
    {
      "id": "123456789012",
      "title": "Sony WH-1000XM4 Wireless Headphones - Brand New",
      "price": 329.99,
      "rating": 4.5,
      "reviewCount": 892,
      "platform": "ebay",
      "url": "https://ebay.com/itm/123456789012",
      "image": "https://i.ebayimg.com/images/g/...",
      "features": ["new condition"],
      "availability": true,
      "auctionEnds": "2024-01-15T18:30:00Z",
      "condition": "New"
    }
  ],
  "totalCount": 8,
  "searchUrl": "https://ebay.com/sch/i.html?_nkw=wireless+headphones"
}
```

### Walmart Real Response:
```json
{
  "platform": "walmart",
  "products": [
    {
      "id": "123456789",
      "title": "Sony Wireless Bluetooth Headphones",
      "price": 289.00,
      "rating": 4.2,
      "reviewCount": 567,
      "platform": "walmart",
      "url": "https://walmart.com/ip/123456789",
      "image": "https://i5.walmartimages.com/...",
      "features": ["free shipping", "in-store pickup"],
      "availability": true,
      "inStorePickup": true
    }
  ],
  "totalCount": 6,
  "searchUrl": "https://walmart.com/search?q=wireless+headphones"
}
```

## 🔍 API Integration Benefits

### Real Data vs Mock Data:

| Feature | Mock Data | Real API |
|---------|------------|-----------|
| **Actual Prices** | ❌ Random prices | ✅ Real market prices |
| **Real Availability** | ❌ Random availability | ✅ Actual stock status |
| **Customer Reviews** | ❌ Fake reviews | ✅ Real customer feedback |
| **Product Images** | ❌ Placeholder images | ✅ Actual product photos |
| **Deal Detection** | ❌ Simulated deals | ✅ Real discounts |
| **Shipping Info** | ❌ Generic info | ✅ Real shipping options |

## 🛡️ Error Handling

The system automatically falls back to mock data if:

1. **API Keys Missing**: Uses mock data with warning
2. **API Rate Limited**: Falls back after 3 failed attempts
3. **API Errors**: Logs error and uses mock data
4. **Network Issues**: Timeout after 10 seconds

## 📈 Performance Considerations

### Real API Response Times:
- **Amazon**: 500-2000ms
- **eBay**: 400-1500ms
- **Walmart**: 300-1000ms
- **Shopify**: 600-2000ms

### Optimization Tips:
1. **Enable Caching**: Set `ENABLE_CACHE=true` in `.env`
2. **Use CDN**: Configure `CDN_URL` for faster image loading
3. **Batch Requests**: Use `BATCH_SIZE=20` for bulk operations

## 🔧 Advanced Configuration

### Caching:
```bash
ENABLE_CACHE=true
CACHE_TTL=300  # 5 minutes
REDIS_URL=redis://localhost:6379
```

### Rate Limiting:
```bash
API_RATE_LIMIT=100  # requests per minute
API_BURST_LIMIT=200  # burst capacity
```

### Monitoring:
```bash
ENABLE_METRICS=true
METRICS_ENDPOINT=https://your-metrics-service.com/api
```

## 🚨 Troubleshooting

### Common Issues:

#### 1. Amazon API 403 Forbidden
```bash
# Check your AWS credentials
AMAZON_ACCESS_KEY=correct_key_here
AMAZON_SECRET_KEY=correct_secret_here
AMAZON_ASSOCIATE_TAG=your-tag-20
```

#### 2. eBay API Invalid Request
```bash
# Verify App ID and token
EBAY_APP_ID=YourAppId-1234567890
EBAY_TOKEN=AgAAAA**correct_token_here**EXAMPLE
```

#### 3. Walmart API 401 Unauthorized
```bash
# Check API key validity
WALMART_API_KEY=valid_key_from_walmart_portal
```

### Debug Mode:
```bash
# Enable detailed logging
LOG_LEVEL=debug
SKIP_DB=true
npm run dev
```

## 📞 Support

### API Documentation:
- [Amazon Product Advertising API](https://webservices.amazon.com/paapi5/documentation/)
- [eBay Finding API](https://developer.ebay.com/devzone/finding/)
- [Walmart Product API](https://developer.walmart.com/docs)
- [Shopify Storefront API](https://shopify.dev/docs/storefront-api)

### Community Support:
- [GitHub Issues](https://github.com/yourusername/ai-commerce-intelligence/issues)
- [Discord Community](https://discord.gg/your-community)

## 🎯 Next Steps

1. **Get API Keys**: Apply for developer accounts
2. **Configure Environment**: Add keys to `.env`
3. **Test Integration**: Run `node manual-test.js`
4. **Monitor Performance**: Check response times and error rates
5. **Optimize**: Enable caching and rate limiting

Your AI Commerce Intelligence system is now ready for real-world product searches! 🚀
