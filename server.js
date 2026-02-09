require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await connectDB();
    logger.info('Database connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
