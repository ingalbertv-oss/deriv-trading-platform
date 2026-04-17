import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug(`Prisma Query: ${e.query} - Duration: ${e.duration}ms`);
});

export { prisma };
export default prisma;
