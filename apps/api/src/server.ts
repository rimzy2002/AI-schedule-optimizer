import app from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';

const startServer = async () => {
  try {
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      console.log('Successfully connected to the database.');
    } else {
      console.warn('Failed to connect to the database on startup.');
    }

    app.listen(env.port, () => {
      console.log(`Server is running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
