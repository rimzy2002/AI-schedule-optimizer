import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { QUEUE_NAMES } from './queue.constants';

const redisConnection = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null, // Required by bullmq
});

export const syllabusQueue = new Queue(QUEUE_NAMES.SYLLABUS_PROCESSING, {
  connection: redisConnection,
});
