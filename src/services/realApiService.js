const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class RealApiService {
  constructor() {
    this.apiKeys = {
      amazon: {
        accessKey: process.env.AMAZON_ACCESS_KEY,
        secretKey: process.env.AMAZON_SECRET_KEY,
        associateTag: process.env.AMAZON_ASSOCIATE_TAG,
        marketplace: process.env.AMAZON_MARKETPLACE || 'www.amazon.com',
        region: process.env.AMAZON_REGION || 'us-east-1'
      },
      ebay: {
        appId: process.env.EBAY_APP_ID,
        certId: process.env.EBAY_CERT_ID,
        devId: process.env.EBAY_DEV_ID,
        token: process.env.EBAY_TOKEN,
        sandbox: process.env.EBAY_SANDBOX === 'true'
      },
      walmart: {
        apiKey: process.env.WALMART_API_KEY,
        baseUrl: process.env.WALMART_API_URL || 'https://api.walmart.com/v2'
      }
    };
  }

  // Amazon Product Advertising API
  async searchAmazon(query, parsedQuery) {
    try {
      if (!this.apiKeys.amazon.accessKey || !this.apiKeys.amazon.secretKey) {
        logger.warn('Amazon API keys not found, using mock data');
        return this.generateAmazonMock(query, parsedQuery);
      }

      logger.info(`Searching Amazon API for: ${query}`);
      
      // Prepare Amazon PA-API 5.0 request
      const host = 'webservices.amazon.com';
      const path = '/paapi5/searchitems';
      
      const payload = {
        Keywords: query,
        SearchIndex: this.getAmazonSearchIndex(parsedQuery.category),
        Resources: [
          'Images.Primary.Medium',
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'Offers.Listings.Price',
          'CustomerReviews.Rating',
          'CustomerReviews.Count'
        ],
        PartnerTag: this.apiKeys.amazon.associateTag,
        PartnerType: 'Associates',
        Marketplace: this.apiKeys.amazon.marketplace,
        Condition: 'New',
        SortBy: 'Price:LowToHigh',
        ItemCount: 10
      };

      // Create AWS signature
      const amzDate = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
      const signature = this.createAmazonSignature(payload, amzDate, host, path);
      
      const response = await axios.post(`https://${host}${path}`, payload, {
        headers: {
          'X-Amz-Date': amzDate,
          'Host': host,
          'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `AWS4-HMAC-SHA256 Credential=${this.apiKeys.amazon.accessKey}/${amzDate.substr(0, 8)}/${this.apiKeys.amazon.region}/paapi5/aws4_request, SignedHeaders=host;x-amz-date;x-amz-target, Signature=${signature}`
        },
        timeout: 10000
      });

      return this.formatAmazonResults(response.data, query);
      
    } catch (error) {
      logger.error('Amazon API search failed:', error.message);
      
      // Fallback to mock on API failure
      if (error.response?.status === 401 || error.response?.status === 403) {
        logger.warn('Amazon API authentication failed, using mock data');
      }
      
      return this.generateAmazonMock(query, parsedQuery);
    }
  }

  createAmazonSignature(payload, amzDate, host, path) {
    const method = 'POST';
    const service = 'paapi5';
    const region = this.apiKeys.amazon.region;
    
    const canonicalUri = path;
    const canonicalQuerystring = '';
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems`;
    const signedHeaders = 'host;x-amz-date;x-amz-target';
    
    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;
    
    const credentialScope = `${amzDate.substr(0, 8)}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
    
    const signingKey = this.getAWS4SigningKey(
      this.apiKeys.amazon.secretKey,
      amzDate.substr(0, 8),
      region,
      service
    );
    
    return crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  }

  getAWS4SigningKey(key, dateStamp, regionName, serviceName) {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  formatAmazonResults(data, query) {
    const products = [];
    
    if (data.SearchResult && data.SearchResult.Items) {
      data.SearchResult.Items.forEach((item, index) => {
        const price = item.Offers?.Listings?.[0]?.Price?.Amount || 0;
        const rating = item.CustomerReviews?.Rating || 0;
        const reviewCount = item.CustomerReviews?.Count || 0;
        
        products.push({
          id: item.ASIN || `amazon_${index + 1}`,
          title: item.ItemInfo?.Title?.DisplayValue || `${query} - Amazon Product ${index + 1}`,
          price: parseFloat(price) || 0,
          rating: parseFloat(rating) || 0,
          reviewCount: parseInt(reviewCount) || 0,
          platform: 'amazon',
          url: item.DetailPageURL || `https://amazon.com/dp/${item.ASIN}`,
          image: item.Images?.Primary?.Medium?.URL || `https://via.placeholder.com/300x300?text=amazon+${index + 1}`,
          features: this.extractAmazonFeatures(item.ItemInfo?.Features?.DisplayValues || []),
          availability: item.Offers?.Listings?.[0]?.Availability || 'Unknown',
          primeEligible: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible || false
        });
      });
    }
    
    return {
      platform: 'amazon',
      products,
      totalCount: products.length,
      searchUrl: `https://amazon.com/s?k=${encodeURIComponent(query)}`
    };
  }

  extractAmazonFeatures(features) {
    const extractedFeatures = [];
    
    if (Array.isArray(features)) {
      features.forEach(feature => {
        if (typeof feature === 'string') {
          extractedFeatures.push(feature.toLowerCase());
        }
      });
    }
    
    return extractedFeatures;
  }

  getAmazonSearchIndex(category) {
    const categoryMap = {
      'electronics': 'Electronics',
      'clothing': 'Fashion',
      'home': 'HomeGarden',
      'sports': 'Sports',
      'books': 'Books'
    };
    
    return categoryMap[category] || 'All';
  }

  // eBay Finding API
  async searchEbay(query, parsedQuery) {
    try {
      if (!this.apiKeys.ebay.appId) {
        logger.warn('eBay API keys not found, using mock data');
        return this.generateEbayMock(query, parsedQuery);
      }

      logger.info(`Searching eBay API for: ${query}`);
      
      const baseUrl = this.apiKeys.ebay.sandbox 
        ? 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
        : 'https://svcs.ebay.com/services/search/FindingService/v1';
      
      const response = await axios.get(baseUrl, {
        params: {
          'OPERATION-NAME': 'findItemsByKeywords',
          'SERVICE-VERSION': '1.13.0',
          'SECURITY-APPNAME': this.apiKeys.ebay.appId,
          'RESPONSE-DATA-FORMAT': 'JSON',
          'REST-PAYLOAD': JSON.stringify({
            keywords: query,
            itemFilter: [
              {
                name: 'Condition',
                value: 'New'
              }
            ],
            paginationInput: {
              entriesPerPage: 10,
              pageNumber: 1
            },
            sortOrder: 'PricePlusShippingLowest'
          })
        },
        timeout: 10000
      });

      return this.formatEbayResults(response.data, query);
      
    } catch (error) {
      logger.error('eBay API search failed:', error.message);
      return this.generateEbayMock(query, parsedQuery);
    }
  }

  formatEbayResults(data, query) {
    const products = [];
    
    if (data.findItemsByKeywordsResponse && data.findItemsByKeywordsResponse[0].searchResult) {
      const items = data.findItemsByKeywordsResponse[0].searchResult.item || [];
      
      items.forEach((item, index) => {
        const price = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0;
        const rating = item.sellerInfo?.positiveFeedbackPercent || 0;
        const reviewCount = item.sellerInfo?.feedbackScore || 0;
        
        products.push({
          id: item.itemId || `ebay_${index + 1}`,
          title: item.title || `${query} - eBay Listing ${index + 1}`,
          price: parseFloat(price) || 0,
          rating: parseFloat(rating) / 20 || 0, // Convert percentage to 5-star scale
          reviewCount: parseInt(reviewCount) || 0,
          platform: 'ebay',
          url: item.viewItemURL || `https://ebay.com/itm/${item.itemId}`,
          image: item.galleryURL || `https://via.placeholder.com/300x300?text=ebay+${index + 1}`,
          features: this.extractEbayFeatures(item.subtitle || ''),
          availability: item.sellingStatus?.[0]?.sellingState === 'Active',
          auctionEnds: item.listingInfo?.[0]?.endTime || null,
          condition: item.condition?.[0]?.conditionDisplayName || 'Unknown'
        });
      });
    }
    
    return {
      platform: 'ebay',
      products,
      totalCount: products.length,
      searchUrl: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`
    };
  }

  extractEbayFeatures(subtitle) {
    const features = [];
    const lowerSubtitle = subtitle.toLowerCase();
    
    const featureKeywords = ['new', 'used', 'wireless', 'bluetooth', 'original', 'authentic'];
    featureKeywords.forEach(keyword => {
      if (lowerSubtitle.includes(keyword)) {
        features.push(keyword);
      }
    });
    
    return features;
  }

  // Walmart Product API
  async searchWalmart(query, parsedQuery) {
    try {
      if (!this.apiKeys.walmart.apiKey) {
        logger.warn('Walmart API key not found, using mock data');
        return this.generateWalmartMock(query, parsedQuery);
      }

      logger.info(`Searching Walmart API for: ${query}`);
      
      const response = await axios.get(`${this.apiKeys.walmart.baseUrl}/search`, {
        params: {
          query: query,
          apiKey: this.apiKeys.walmart.apiKey,
          format: 'json',
          pageSize: 10,
          sort: 'price',
          order: 'asc'
        },
        timeout: 10000
      });

      return this.formatWalmartResults(response.data, query);
      
    } catch (error) {
      logger.error('Walmart API search failed:', error.message);
      return this.generateWalmartMock(query, parsedQuery);
    }
  }

  formatWalmartResults(data, query) {
    const products = [];
    
    if (data.items) {
      data.items.forEach((item, index) => {
        const price = item.salePrice || item.msrp || 0;
        const rating = item.customerRating || 0;
        const reviewCount = item.numReviews || 0;
        
        products.push({
          id: item.itemId || `walmart_${index + 1}`,
          title: item.name || `${query} - Walmart Item ${index + 1}`,
          price: parseFloat(price) || 0,
          rating: parseFloat(rating) || 0,
          reviewCount: parseInt(reviewCount) || 0,
          platform: 'walmart',
          url: item.productUrl || `https://walmart.com/ip/${item.itemId}`,
          image: item.mediumImage || `https://via.placeholder.com/300x300?text=walmart+${index + 1}`,
          features: this.extractWalmartFeatures(item),
          availability: item.stock === 'Available',
          inStorePickup: item.availableOnline === true
        });
      });
    }
    
    return {
      platform: 'walmart',
      products,
      totalCount: products.length,
      searchUrl: `https://walmart.com/search?q=${encodeURIComponent(query)}`
    };
  }

  extractWalmartFeatures(item) {
    const features = [];
    
    if (item.availableOnline) features.push('free shipping');
    if (item.stock === 'Available') features.push('in-store pickup');
    if (item.categoryPath) features.push(item.categoryPath.toLowerCase());
    
    return features;
  }

  // Shopify Store Search (using public search)
  async searchShopify(query, parsedQuery) {
    try {
      logger.info(`Searching Shopify stores for: ${query}`);
      
      // Use Shopify's public search API
      const response = await axios.get('https://www.shopify.com/api/search/products', {
        params: {
          query: query,
          limit: 10,
          sort: 'relevance'
        },
        timeout: 10000
      });

      return this.formatShopifyResults(response.data, query);
      
    } catch (error) {
      logger.error('Shopify API search failed:', error.message);
      return this.generateShopifyMock(query, parsedQuery);
    }
  }

  formatShopifyResults(data, query) {
    const products = [];
    
    if (data.products) {
      data.products.forEach((item, index) => {
        const price = item.variants?.[0]?.price || 0;
        const rating = item.rating || 0;
        const reviewCount = item.reviewCount || 0;
        
        products.push({
          id: item.id || `shopify_${index + 1}`,
          title: item.title || `${query} - Shopify Store ${index + 1}`,
          price: parseFloat(price) || 0,
          rating: parseFloat(rating) || 0,
          reviewCount: parseInt(reviewCount) || 0,
          platform: 'shopify',
          url: item.onlineStoreUrl || `https://shopify.com/products/${item.id}`,
          image: item.image?.src || `https://via.placeholder.com/300x300?text=shopify+${index + 1}`,
          features: this.extractShopifyFeatures(item),
          availability: item.available === true,
          storeName: item.vendor || 'Unknown Store'
        });
      });
    }
    
    return {
      platform: 'shopify',
      products,
      totalCount: products.length,
      searchUrl: `https://shopify.com/search?q=${encodeURIComponent(query)}`
    };
  }

  extractShopifyFeatures(item) {
    const features = [];
    
    if (item.tags && Array.isArray(item.tags)) {
      features.push(...item.tags.map(tag => tag.toLowerCase()));
    }
    
    if (item.productType) {
      features.push(item.productType.toLowerCase());
    }
    
    return features;
  }

  // Mock fallback methods
  generateAmazonMock(query, parsedQuery) {
    const products = [];
    const basePrice = Math.random() * 100 + 20;

    for (let i = 0; i < 5; i++) {
      products.push({
        id: `amazon_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - Amazon Product ${i + 1}`,
        price: basePrice + (Math.random() * 50 - 25),
        rating: 3 + Math.random() * 2,
        reviewCount: Math.floor(Math.random() * 1000),
        platform: 'amazon',
        url: `https://amazon.com/dp/amazon_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=amazon+${i + 1}`,
        features: ['wireless', 'bluetooth', 'noise cancelling'],
        availability: Math.random() > 0.2,
        primeEligible: Math.random() > 0.3
      });
    }

    return {
      platform: 'amazon',
      products,
      totalCount: 5,
      searchUrl: `https://amazon.com/s?k=${encodeURIComponent(query)}`
    };
  }

  generateEbayMock(query, parsedQuery) {
    const products = [];
    const basePrice = Math.random() * 60 + 10;

    for (let i = 0; i < 6; i++) {
      products.push({
        id: `ebay_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - eBay Listing ${i + 1}`,
        price: basePrice + (Math.random() * 30 - 15),
        rating: 3 + Math.random() * 2,
        reviewCount: Math.floor(Math.random() * 800),
        platform: 'ebay',
        url: `https://ebay.com/itm/ebay_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=ebay+${i + 1}`,
        features: ['used', 'new condition'].filter(() => Math.random() > 0.5),
        availability: Math.random() > 0.3,
        condition: Math.random() > 0.5 ? 'New' : 'Used'
      });
    }

    return {
      platform: 'ebay',
      products,
      totalCount: 6,
      searchUrl: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`
    };
  }

  generateWalmartMock(query, parsedQuery) {
    const products = [];
    const basePrice = Math.random() * 70 + 25;

    for (let i = 0; i < 4; i++) {
      products.push({
        id: `walmart_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - Walmart Item ${i + 1}`,
        price: basePrice + (Math.random() * 35 - 17),
        rating: 3.2 + Math.random() * 1.8,
        reviewCount: Math.floor(Math.random() * 600),
        platform: 'walmart',
        url: `https://walmart.com/ip/walmart_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=walmart+${i + 1}`,
        features: ['in-store pickup', 'free shipping'],
        availability: Math.random() > 0.15
      });
    }

    return {
      platform: 'walmart',
      products,
      totalCount: 4,
      searchUrl: `https://walmart.com/search?q=${encodeURIComponent(query)}`
    };
  }

  generateShopifyMock(query, parsedQuery) {
    const products = [];
    const basePrice = Math.random() * 80 + 30;

    for (let i = 0; i < 4; i++) {
      products.push({
        id: `shopify_${i + 1}`,
        title: `${query.charAt(0).toUpperCase() + query.slice(1)} - Shopify Store ${i + 1}`,
        price: basePrice + (Math.random() * 40 - 20),
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 500),
        platform: 'shopify',
        url: `https://store.shopify.com/products/shopify_${i + 1}`,
        image: `https://via.placeholder.com/300x300?text=shopify+${i + 1}`,
        features: ['portable', 'lightweight'],
        availability: Math.random() > 0.1
      });
    }

    return {
      platform: 'shopify',
      products,
      totalCount: 4,
      searchUrl: `https://shopify.com/search?q=${encodeURIComponent(query)}`
    };
  }
}

module.exports = RealApiService;
