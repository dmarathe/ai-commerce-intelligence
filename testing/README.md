# Testing Structure

This directory contains organized test files for the AI Commerce Intelligence system.

## 📁 Test Categories

### **🧪 Unit Tests**
- `unit/` - Individual component tests
- `test-*.js` - Specific component tests

### **🔄 Integration Tests**  
- `integration/` - End-to-end workflow tests
- `final-verification-test.js` - Complete system verification

### **🌐 API Tests**
- `api/` - API endpoint tests
- `manual-test.js` - Manual API testing

### **⚡ Performance Tests**
- `performance/` - Load and performance testing

## 🎯 Usage

```bash
# Run all tests
npm test

# Run specific test category
npm run test:unit
npm run test:integration  
npm run test:api
npm run test:performance

# Run final verification
node testing/final-verification-test.js
```

## 📋 Test Files Organization

```
testing/
├── README.md                    # This file
├── unit/                        # Unit tests
│   ├── test-text-parsing.js
│   ├── test-api-service.js
│   └── test-mcp-manager.js
├── integration/                 # Integration tests
│   ├── test-search-flow.js
│   └── test-parser-flow.js
├── api/                         # API tests
│   ├── test-endpoints.js
│   └── test-responses.js
├── performance/                 # Performance tests
│   ├── test-load.js
│   └── test-response-time.js
└── final-verification-test.js  # Complete system test
```

This structure provides:
- ✅ **Clear organization** by test type
- ✅ **Easy maintenance** and updates
- ✅ **Comprehensive coverage** of all components
- ✅ **Scalable testing** approach
