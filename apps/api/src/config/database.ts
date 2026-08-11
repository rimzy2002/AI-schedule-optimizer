import { prisma } from '@ai-schedule-optimizer/database';

export const checkDatabaseConnection = async () => {
  try {
    // Attempt a simple query to verify the connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export { prisma };
