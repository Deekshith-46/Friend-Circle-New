const mongoose = require('mongoose');

// Global caching for Vercel serverless functions
let cachedConnection = null;

const connectDB = async () => {
  // Use cached connection in serverless environment
  if (cachedConnection) {
    return cachedConnection;
  }
  
  try {
    cachedConnection = await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
    return cachedConnection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

module.exports = connectDB;
