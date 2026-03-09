const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Check if we want to skip database connection
    if (process.env.SKIP_DB === 'true') {
      logger.info('Database connection skipped (SKIP_DB=true)');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_commerce_intelligence', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    
    // Don't exit the process, just log the error
    // This allows the server to run without database for testing
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Continuing without database connection...');
      return;
    }
    
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (!process.env.SKIP_DB) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
  }
  process.exit(0);
});

module.exports = connectDB;
